/**
 * projectRouter — CRUD for saved drawing projects.
 * Each user can have multiple named projects.
 */
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { projects } from "../drizzle/schema";

export const projectRouter = router({
  /** List all projects for the current user */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: projects.id,
        name: projects.name,
        pxPerFoot: projects.pxPerFoot,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(eq(projects.userId, ctx.user.id))
      .orderBy(desc(projects.updatedAt));
  }),

  /** Get a single project (walls + openings JSON) */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)))
        .limit(1);
      return rows[0] ?? null;
    }),

  /** Save (create or update) a project */
  save: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1).max(255),
        wallsJson: z.string(),
        openingsJson: z.string(),
        pxPerFoot: z.number().int().min(1).max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      if (input.id) {
        // Update existing — verify ownership first
        const existing = await db
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)))
          .limit(1);
        if (!existing[0]) throw new Error("Project not found");

        await db
          .update(projects)
          .set({
            name: input.name,
            wallsJson: input.wallsJson,
            openingsJson: input.openingsJson,
            pxPerFoot: input.pxPerFoot,
          })
          .where(eq(projects.id, input.id));
        return { id: input.id };
      } else {
        // Create new
        const result = await db.insert(projects).values({
          userId: ctx.user.id,
          name: input.name,
          wallsJson: input.wallsJson,
          openingsJson: input.openingsJson,
          pxPerFoot: input.pxPerFoot,
        });
        return { id: Number((result as any)[0]?.insertId ?? 0) };
      }
    }),

  /** Delete a project */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db
        .delete(projects)
        .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)));
      return { success: true };
    }),
});
