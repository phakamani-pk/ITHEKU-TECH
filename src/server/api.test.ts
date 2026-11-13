// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
  rpc: vi.fn(),
  insert: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));

import { handleApi } from "./handler";

const projectId = "10000000-0000-4000-8000-000000000001";
const userId = "20000000-0000-4000-8000-000000000001";
const validLead = {
  requestId: "30000000-0000-4000-8000-000000000001",
  name: "Test User",
  email: "test@example.com",
  company: "",
  service: "Web",
  message: "We need a website.",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
  mocks.getUser.mockResolvedValue({
    data: { user: { id: userId, app_metadata: {} } },
    error: null,
  });
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.maybeSingle.mockResolvedValue({ data: { id: projectId }, error: null });
  mocks.createClient.mockReturnValue({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
      insert: mocks.insert,
    }),
  });
});

function call(path: string, method = "GET", body?: unknown, token?: string) {
  return handleApi(
    new Request(`http://localhost${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
  );
}

describe("Express API", () => {
  it("validates leads and calls the restricted submission function", async () => {
    expect((await call("/api/leads", "POST", {})).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect((await call("/api/leads", "POST", validLead)).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "submit_public_lead",
      expect.objectContaining({ p_request_id: validLead.requestId, p_email: validLead.email }),
    );
    mocks.rpc.mockResolvedValue({ error: { message: "lead_rate_limit" } });
    expect((await call("/api/leads", "POST", validLead)).status).toBe(429);
  });

  it("requires a verified token and forwards it for RLS", async () => {
    expect((await call("/api/projects")).status).toBe(401);
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: { status: 401 } });
    expect((await call("/api/projects", "GET", undefined, "invalid")).status).toBe(401);
    expect(mocks.getUser).toHaveBeenCalledWith("invalid");
    expect(mocks.createClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ global: { headers: { Authorization: "Bearer invalid" } } }),
    );
  });

  it("does not mistake an authentication service outage for a bad login", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { status: 503, message: "unavailable" },
    });
    expect((await call("/api/projects", "GET", undefined, "token")).status).toBe(503);
  });

  it("rejects client attempts to create projects and publish updates", async () => {
    expect(
      (
        await call(
          "/api/projects",
          "POST",
          { name: "Project", description: "", client_id: userId },
          "client",
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await call(
          `/api/projects/${projectId}/updates`,
          "POST",
          { title: "Test", body: "Test" },
          "client",
        )
      ).status,
    ).toBe(403);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("uses the verified sender and hides inaccessible projects", async () => {
    const body = { body: "Hello", sender_id: "attacker-chosen" };
    expect((await call(`/api/projects/${projectId}/messages`, "POST", body, "client")).status).toBe(
      201,
    );
    expect(mocks.insert).toHaveBeenCalledWith({
      body: "Hello",
      project_id: projectId,
      sender_id: userId,
    });
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect((await call(`/api/projects/${projectId}/messages`, "POST", body, "client")).status).toBe(
      404,
    );
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });
});
