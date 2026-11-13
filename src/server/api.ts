import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { z } from "zod";
import { leadSchema } from "../lib/lead-schema";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function supabaseClient(token?: string) {
  const url =
    process.env["SUPABASE_URL"] ||
    process.env["VITE_SUPABASE_URL"] ||
    import.meta.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Supabase is not configured.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
  });
}

type AuthResponse = Response<unknown, { client: SupabaseClient; user: User }>;

async function authenticate(req: Request, res: AuthResponse, next: NextFunction) {
  const token = /^Bearer ([^\s]+)$/i.exec(req.get("authorization") ?? "")?.[1];
  if (!token) {
    res.status(401).json({ error: "Please sign in." });
    return;
  }
  const client = supabaseClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error && error.status !== 400 && error.status !== 401 && error.status !== 403) {
    console.error("Supabase authentication failed:", error.message);
    res.status(503).json({ error: "Authentication is temporarily unavailable. Please try again." });
    return;
  }
  if (error || !data.user) {
    res.status(401).json({ error: "Your session is invalid or expired. Please sign in again." });
    return;
  }
  res.locals.client = client;
  res.locals.user = data.user;
  next();
}

function requireStaff(_req: Request, res: AuthResponse, next: NextFunction) {
  const role = res.locals.user.app_metadata["role"];
  if (role !== "admin" && role !== "staff") {
    res.status(403).json({ error: "Staff access required." });
    return;
  }
  next();
}

function parse<T>(schema: z.ZodType<T>, value: unknown, res: Response): T | undefined {
  const result = schema.safeParse(value);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid request." });
    return undefined;
  }
  return result.data;
}

function databaseError(error: { code?: string; message: string }) {
  console.error("Supabase API request failed:", error.code, error.message);
  throw new Error("The request could not be completed. Please try again.");
}

const projectId = z.string().uuid();
const projectFields = {
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(5000),
};
const createProject = z.object({ ...projectFields, client_id: z.string().uuid() });
const updateProject = z.object({
  ...projectFields,
  status: z.enum(["planning", "in_progress", "review", "completed"]),
  progress: z.number().int().min(0).max(100),
});
const createUpdate = z.object({
  title: z.string().trim().min(1).max(150),
  body: z.string().trim().min(1).max(5000),
});
const createMessage = z.object({ body: z.string().trim().min(1).max(5000) });

app.post("/api/leads", async (req, res) => {
  const lead = parse(leadSchema, req.body, res);
  if (!lead) return;
  const { error } = await supabaseClient().rpc("submit_public_lead", {
    p_request_id: lead.requestId,
    p_name: lead.name,
    p_email: lead.email,
    p_company: lead.company,
    p_service: lead.service,
    p_message: lead.message,
  });
  if (error?.message.includes("lead_rate_limit")) {
    res
      .status(429)
      .json({ error: "Too many requests from this email address. Please try again later." });
    return;
  }
  if (error) databaseError(error);
  res.status(200).json({ success: true });
});

app.use("/api", authenticate);

app.get("/api/projects", async (_req, res: AuthResponse) => {
  const { data, error } = await res.locals.client
    .from("platform_projects")
    .select("id, client_id, name, description, status, progress, created_at")
    .order("created_at", { ascending: false });
  if (error) databaseError(error);
  res.json({ projects: data });
});

app.get("/api/profiles", requireStaff, async (_req, res: AuthResponse) => {
  const { data, error } = await res.locals.client
    .from("platform_profiles")
    .select("id, email, display_name")
    .order("email");
  if (error) databaseError(error);
  res.json({ profiles: data });
});

app.post("/api/projects", requireStaff, async (req, res: AuthResponse) => {
  const input = parse(createProject, req.body, res);
  if (!input) return;
  const { data, error } = await res.locals.client
    .from("platform_projects")
    .insert(input)
    .select("id")
    .single();
  if (error) databaseError(error);
  res.status(201).json(data);
});

app.patch("/api/projects/:id", requireStaff, async (req, res: AuthResponse) => {
  const id = parse(projectId, req.params["id"], res);
  if (!id) return;
  const input = parse(updateProject, req.body, res);
  if (!input) return;
  const { data, error } = await res.locals.client
    .from("platform_projects")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) databaseError(error);
  if (!data) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  res.json(data);
});

async function canAccessProject(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from("platform_projects")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) databaseError(error);
  return !!data;
}

app.get("/api/projects/:id/activity", async (req, res: AuthResponse) => {
  const id = parse(projectId, req.params["id"], res);
  if (!id) return;
  const client = res.locals.client;
  if (!(await canAccessProject(client, id))) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const [updates, messages] = await Promise.all([
    client
      .from("platform_project_updates")
      .select("id, title, body, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    client
      .from("platform_project_messages")
      .select("id, sender_id, body, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (updates.error) databaseError(updates.error);
  if (messages.error) databaseError(messages.error);
  res.json({ updates: updates.data, messages: messages.data });
});

app.post("/api/projects/:id/updates", requireStaff, async (req, res: AuthResponse) => {
  const id = parse(projectId, req.params["id"], res);
  if (!id) return;
  const input = parse(createUpdate, req.body, res);
  if (!input) return;
  if (!(await canAccessProject(res.locals.client, id))) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const { error } = await res.locals.client
    .from("platform_project_updates")
    .insert({ ...input, project_id: id, author_id: res.locals.user.id });
  if (error) databaseError(error);
  res.status(201).json({ success: true });
});

app.post("/api/projects/:id/messages", async (req, res: AuthResponse) => {
  const id = parse(projectId, req.params["id"], res);
  if (!id) return;
  const input = parse(createMessage, req.body, res);
  if (!input) return;
  if (!(await canAccessProject(res.locals.client, id))) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const { error } = await res.locals.client
    .from("platform_project_messages")
    .insert({ ...input, project_id: id, sender_id: res.locals.user.id });
  if (error) databaseError(error);
  res.status(201).json({ success: true });
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found." });
});
const handleError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    res.status(400).json({ error: "Invalid JSON." });
    return;
  }
  if (error instanceof Error && "status" in error && error.status === 413) {
    res.status(413).json({ error: "Request is too large." });
    return;
  }
  console.error("Express API error:", error);
  res.status(500).json({ error: "The service is temporarily unavailable. Please try again." });
};
app.use(handleError);

export default app;
