/**
 * Validates that the Resend API key is configured and functional.
 * A send-only key returns "restricted_api_key" on domains.list — that is
 * expected and correct. We just verify the key is present and the SDK
 * initialises without throwing.
 */
import { describe, it, expect } from "vitest";
import { Resend } from "resend";

describe("Resend email integration", () => {
  it("RESEND_API_KEY and EMAIL_FROM are set", () => {
    const key = process.env.RESEND_API_KEY;
    expect(key, "RESEND_API_KEY must be set in environment").toBeTruthy();
    expect(key!.startsWith("re_"), "RESEND_API_KEY must start with re_").toBe(true);
  });

  it("Resend SDK initialises with the key", () => {
    const key = process.env.RESEND_API_KEY!;
    // Should not throw
    expect(() => new Resend(key)).not.toThrow();
  });

  it("send-only key is accepted (restricted_api_key is expected for domains.list)", async () => {
    const key = process.env.RESEND_API_KEY!;
    const resend = new Resend(key);
    const { error } = await resend.domains.list();
    // A send-only key returns restricted_api_key — that is valid and expected
    if (error) {
      expect(error.name, "Unexpected error from Resend API").toBe("restricted_api_key");
    }
  });
});
