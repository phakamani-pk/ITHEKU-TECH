import { z } from "zod";
import { getSupabase } from "./supabase";

const statusSchema = z.enum(["planning", "in_progress", "review", "completed"]);
const projectSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  name: z.string(),
  description: z.string(),
  status: statusSchema,
  progress: z.number(),
  created_at: z.string(),
});
const profileSchema = z.object({ id: z.string(), email: z.string(), display_name: z.string() });
const updateSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  created_at: z.string(),
});
const messageSchema = z.object({
  id: z.string(),
  sender_id: z.string(),
  body: z.string(),
  created_at: z.string(),
});

export type Status = z.infer<typeof statusSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Update = z.infer<typeof updateSchema>;
export type Message = z.infer<typeof messageSchema>;

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  method = "GET",
  body?: object,
): Promise<T> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error("Please sign in again.");
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const parsedError = z.object({ error: z.string() }).safeParse(result);
    throw new Error(
      parsedError.success ? parsedError.data.error : "The request could not be completed.",
    );
  }
  const parsed = schema.safeParse(result);
  if (!parsed.success) throw new Error("The server returned an invalid response.");
  return parsed.data;
}

const identifier = z.object({ id: z.string() });
const success = z.object({ success: z.literal(true) });
export const workspaceApi = {
  projects: () => request("/projects", z.object({ projects: z.array(projectSchema) })),
  profiles: () => request("/profiles", z.object({ profiles: z.array(profileSchema) })),
  activity: (id: string) =>
    request(
      `/projects/${encodeURIComponent(id)}/activity`,
      z.object({ updates: z.array(updateSchema), messages: z.array(messageSchema) }),
    ),
  createProject: (data: { name: string; description: string; client_id: string }) =>
    request("/projects", identifier, "POST", data),
  updateProject: (
    id: string,
    data: { name: string; description: string; status: string; progress: number },
  ) => request(`/projects/${encodeURIComponent(id)}`, identifier, "PATCH", data),
  addUpdate: (id: string, data: { title: string; body: string }) =>
    request(`/projects/${encodeURIComponent(id)}/updates`, success, "POST", data),
  sendMessage: (id: string, data: { body: string }) =>
    request(`/projects/${encodeURIComponent(id)}/messages`, success, "POST", data),
};
