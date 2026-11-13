import { describe, expect, it } from "vitest";
import { leadSchema } from "./lead-schema";

const validLead = {
  requestId: "7b949bd8-a199-4bc8-9798-3f3000618877",
  name: "  Alex Smith  ",
  email: "  alex@example.com  ",
  company: "",
  service: "Web development",
  message: "We need a new website.",
};

describe("leadSchema", () => {
  it("trims inputs and accepts an optional company", () => {
    expect(leadSchema.parse(validLead)).toMatchObject({
      name: "Alex Smith",
      email: "alex@example.com",
      company: "",
    });
  });

  it("rejects malformed or oversized submissions", () => {
    for (const change of [
      { requestId: "not-an-id" },
      { email: "invalid" },
      { message: "short" },
      { message: "x".repeat(5001) },
      { service: " " },
    ]) {
      expect(leadSchema.safeParse({ ...validLead, ...change }).success).toBe(false);
    }
  });
});
