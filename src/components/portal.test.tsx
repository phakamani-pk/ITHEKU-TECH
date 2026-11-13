import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Portal } from "./portal";

vi.mock("../lib/supabase", () => ({ getSupabase: () => supabase }));
vi.mock("../lib/workspace-api", () => ({ workspaceApi }));

const session = {
  user: { id: "client-id", email: "client@example.com", app_metadata: {} },
};
const records: Record<string, object[]> = {
  platform_projects: [
    {
      id: "project-id",
      client_id: "client-id",
      name: "Client project",
      description: "A real project",
      status: "in_progress",
      progress: 40,
      created_at: "2026-01-01T00:00:00Z",
    },
  ],
  platform_profiles: [{ id: "client-id", email: "client@example.com", display_name: "Client" }],
  platform_project_updates: [
    {
      id: "update-id",
      title: "Design ready",
      body: "Ready for review.",
      created_at: "2026-01-02T00:00:00Z",
    },
  ],
  platform_project_messages: [],
};
const workspaceApi = vi.hoisted(() => ({
  projects: vi.fn(),
  profiles: vi.fn(),
  activity: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  addUpdate: vi.fn(async () => ({ success: true })),
  sendMessage: vi.fn(async () => ({ success: true })),
}));
const supabase = {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  supabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
  workspaceApi.projects.mockResolvedValue({ projects: records["platform_projects"] });
  workspaceApi.profiles.mockResolvedValue({ profiles: records["platform_profiles"] });
  workspaceApi.activity.mockResolvedValue({
    updates: records["platform_project_updates"],
    messages: records["platform_project_messages"],
  });
});
afterEach(cleanup);

describe("project workspaces", () => {
  it("shows assigned project updates and sends a client message", async () => {
    render(<Portal mode="client" />);
    expect(await screen.findByText("Design ready")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Thanks for the update." },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() =>
      expect(workspaceApi.sendMessage).toHaveBeenCalledWith("project-id", {
        body: "Thanks for the update.",
      }),
    );
    expect(await screen.findByText("Message sent.")).toBeInTheDocument();
  });

  it("does not load the admin workspace for a client account", async () => {
    render(<Portal mode="admin" />);
    expect(await screen.findByText("Staff access required")).toBeInTheDocument();
    expect(workspaceApi.projects).not.toHaveBeenCalled();
  });

  it("allows staff to publish project updates", async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: "staff-id", email: "staff@example.com", app_metadata: { role: "admin" } },
        },
      },
      error: null,
    });
    render(<Portal mode="admin" />);
    expect(await screen.findByText("Design ready")).toBeInTheDocument();
    fireEvent.click(screen.getByText("+ Publish an update"));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Build complete" } });
    fireEvent.change(screen.getByLabelText("Update"), { target: { value: "Ready to review." } });
    fireEvent.click(screen.getByRole("button", { name: "Publish update" }));
    await waitFor(() =>
      expect(workspaceApi.addUpdate).toHaveBeenCalledWith("project-id", {
        title: "Build complete",
        body: "Ready to review.",
      }),
    );
    expect(await screen.findByText("Update published.")).toBeInTheDocument();
  });
});
