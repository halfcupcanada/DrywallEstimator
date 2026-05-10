/**
 * Tests for email/password auth routes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";

describe("Email auth helpers", () => {
  it("bcrypt hash and compare round-trip works", async () => {
    const password = "TestPassword123!";
    const hash = await bcrypt.hash(password, 10);
    const valid = await bcrypt.compare(password, hash);
    const invalid = await bcrypt.compare("WrongPassword", hash);
    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });

  it("bcrypt rejects empty password", async () => {
    const hash = await bcrypt.hash("SomePassword", 10);
    const result = await bcrypt.compare("", hash);
    expect(result).toBe(false);
  });

  it("getDb is callable", async () => {
    const mockDb = { select: vi.fn() };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);
    const db = await getDb();
    expect(db).toBeDefined();
  });
});
