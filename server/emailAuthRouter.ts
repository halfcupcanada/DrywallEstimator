/**
 * Email/password authentication routes.
 * Replaces Manus OAuth with a simple email + bcrypt password flow.
 * Session is stored as a JWT in an httpOnly cookie (same cookie name as before).
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { Express, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import { users } from "../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getDb } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";

const BCRYPT_ROUNDS = 12;

function getSecretKey() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

async function createSessionToken(userId: number, email: string): Promise<string> {
  const expiresAt = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);
  return new SignJWT({ sub: String(userId), email })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expiresAt)
    .sign(getSecretKey());
}

async function verifySessionToken(token: string): Promise<{ userId: number; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    const userId = parseInt(String(payload.sub ?? ""), 10);
    const email = String(payload.email ?? "");
    if (!userId || !email) return null;
    return { userId, email };
  } catch {
    return null;
  }
}

export function registerEmailAuthRoutes(app: Express) {
  /** POST /api/auth/signup */
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    const { name, email, password } = req.body ?? {};
    if (!email || !password || !name) {
      res.status(400).json({ error: "name, email and password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    const db = await getDb();
    if (!db) { res.status(500).json({ error: "Database unavailable" }); return; }

    // Check if email already exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const openId = `email_${nanoid(21)}`; // unique openId for email users

    await db.insert(users).values({
      openId,
      name,
      email,
      loginMethod: "email",
      passwordHash,
      role: "user",
      lastSignedIn: new Date(),
    });

    const newUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!newUser[0]) { res.status(500).json({ error: "Failed to create user" }); return; }

    const token = await createSessionToken(newUser[0].id, email);
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    res.json({ ok: true, user: { id: newUser[0].id, name: newUser[0].name, email: newUser[0].email, role: newUser[0].role } });
  });

  /** POST /api/auth/login */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    const db = await getDb();
    if (!db) { res.status(500).json({ error: "Database unavailable" }); return; }

    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Update lastSignedIn
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

    const token = await createSessionToken(user.id, email);
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });

  /** POST /api/auth/logout */
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.json({ ok: true });
  });

  /** GET /api/auth/me */
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const cookies = req.headers.cookie ?? "";
    const match = cookies.split(";").find(c => c.trim().startsWith(`${COOKIE_NAME}=`));
    const token = match?.split("=").slice(1).join("=").trim();

    if (!token) { res.json({ user: null }); return; }

    const session = await verifySessionToken(token);
    if (!session) { res.json({ user: null }); return; }

    const db = await getDb();
    if (!db) { res.json({ user: null }); return; }

    const rows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    const user = rows[0];
    if (!user) { res.json({ user: null }); return; }

    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });
}

/**
 * Authenticate a request using the email/password session cookie.
 * Returns the user or throws if unauthenticated.
 */
export async function authenticateEmailRequest(req: Request) {
  const cookies = req.headers.cookie ?? "";
  const match = cookies.split(";").find(c => c.trim().startsWith(`${COOKIE_NAME}=`));
  const token = match?.split("=").slice(1).join("=").trim();
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const db = await getDb();
  if (!db) return null;

  const rows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return rows[0] ?? null;
}
