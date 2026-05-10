/**
 * teamRouter — Company creation, member invites, and seat management
 * for Enterprise seat-based plans.
 */
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { companies, companyMembers, users } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { sendTeamInviteEmail } from "./email";

export const teamRouter = router({
  /** Get the company the current user owns or belongs to */
  myCompany: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    // Check if user owns a company
    const owned = await db
      .select()
      .from(companies)
      .where(eq(companies.ownerId, ctx.user.id))
      .limit(1);
    if (owned[0]) {
      const members = await db
        .select({
          id: companyMembers.id,
          userId: companyMembers.userId,
          inviteEmail: companyMembers.inviteEmail,
          role: companyMembers.role,
          status: companyMembers.status,
          name: users.name,
          email: users.email,
        })
        .from(companyMembers)
        .leftJoin(users, eq(companyMembers.userId, users.id))
        .where(eq(companyMembers.companyId, owned[0].id));
      return { company: owned[0], members, isOwner: true };
    }

    // Check if user is a member
    const membership = await db
      .select()
      .from(companyMembers)
      .where(and(eq(companyMembers.userId, ctx.user.id), eq(companyMembers.status, "accepted")))
      .limit(1);
    if (membership[0]) {
      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.id, membership[0].companyId))
        .limit(1);
      if (company[0]) {
        return { company: company[0], members: [], isOwner: false };
      }
    }

    return null;
  }),

  /** Create a company (Enterprise owners only) */
  createCompany: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(255), seats: z.number().int().min(1).max(100).default(5) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check if user already owns a company
      const existing = await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.ownerId, ctx.user.id))
        .limit(1);
      if (existing[0]) throw new TRPCError({ code: "CONFLICT", message: "You already have a company" });

      const result = await db.insert(companies).values({
        name: input.name,
        ownerId: ctx.user.id,
        seats: input.seats,
      });

      const companyId = Number((result as any)[0]?.insertId ?? 0);

      // Add owner as a member
      await db.insert(companyMembers).values({
        companyId,
        userId: ctx.user.id,
        inviteEmail: ctx.user.email ?? undefined,
        role: "owner",
        status: "accepted",
      });

      await notifyOwner({
        title: "New Company Created",
        content: `${ctx.user.name ?? ctx.user.email} created company "${input.name}" with ${input.seats} seats.`,
      });

      return { id: companyId };
    }),

  /** Invite a member by email */
  inviteMember: protectedProcedure
    .input(z.object({ email: z.string().email(), origin: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify caller owns a company
      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.ownerId, ctx.user.id))
        .limit(1);
      if (!company[0]) throw new TRPCError({ code: "FORBIDDEN", message: "No company found" });

      // Check seat limit
      const memberCount = await db
        .select({ id: companyMembers.id })
        .from(companyMembers)
        .where(and(eq(companyMembers.companyId, company[0].id), eq(companyMembers.status, "accepted")));
      if (memberCount.length >= company[0].seats) {
        throw new TRPCError({ code: "FORBIDDEN", message: `Seat limit reached (${company[0].seats} seats)` });
      }

      // Check if already invited
      const existing = await db
        .select({ id: companyMembers.id })
        .from(companyMembers)
        .where(and(eq(companyMembers.companyId, company[0].id), eq(companyMembers.inviteEmail, input.email)))
        .limit(1);
      if (existing[0]) throw new TRPCError({ code: "CONFLICT", message: "Already invited" });

      const token = nanoid(32);
      await db.insert(companyMembers).values({
        companyId: company[0].id,
        inviteEmail: input.email,
        inviteToken: token,
        role: "member",
        status: "pending",
      });

      const inviteUrl = `${input.origin}/join?token=${token}`;

      // Send the actual invite email
      const emailSent = await sendTeamInviteEmail({
        toEmail: input.email,
        inviterName: ctx.user.name ?? ctx.user.email ?? "A teammate",
        companyName: company[0].name,
        inviteUrl,
      });

      await notifyOwner({
        title: "Team Invite Sent",
        content: `${ctx.user.name ?? ctx.user.email} invited ${input.email} to "${company[0].name}". Email sent: ${emailSent}. Link: ${inviteUrl}`,
      });

      return { inviteUrl, emailSent };
    }),

  /** Accept an invite via token */
  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const invite = await db
        .select()
        .from(companyMembers)
        .where(and(eq(companyMembers.inviteToken, input.token), eq(companyMembers.status, "pending")))
        .limit(1);
      if (!invite[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired invite" });

      await db
        .update(companyMembers)
        .set({ userId: ctx.user.id, status: "accepted", inviteToken: null })
        .where(eq(companyMembers.id, invite[0].id));

      // Notify owner that a member joined
      const company = await db
        .select({ name: companies.name, ownerId: companies.ownerId })
        .from(companies)
        .where(eq(companies.id, invite[0].companyId))
        .limit(1);
      if (company[0]) {
        await notifyOwner({
          title: "Team Member Joined",
          content: `${ctx.user.name ?? ctx.user.email ?? "A user"} accepted their invite and joined "${company[0].name}".`,
        });
      }

      return { companyId: invite[0].companyId };
    }),

  /** List all members of the caller's company */
  listMembers: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const company = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.ownerId, ctx.user.id))
      .limit(1);
    if (!company[0]) return [];
    return db
      .select({
        id: companyMembers.id,
        userId: companyMembers.userId,
        inviteEmail: companyMembers.inviteEmail,
        role: companyMembers.role,
        status: companyMembers.status,
        name: users.name,
        email: users.email,
      })
      .from(companyMembers)
      .leftJoin(users, eq(companyMembers.userId, users.id))
      .where(eq(companyMembers.companyId, company[0].id));
  }),

  /** Remove a member */
  removeMember: protectedProcedure
    .input(z.object({ memberId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify caller owns the company
      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.ownerId, ctx.user.id))
        .limit(1);
      if (!company[0]) throw new TRPCError({ code: "FORBIDDEN" });

      await db
        .delete(companyMembers)
        .where(and(eq(companyMembers.id, input.memberId), eq(companyMembers.companyId, company[0].id)));

      return { success: true };
    }),
});
