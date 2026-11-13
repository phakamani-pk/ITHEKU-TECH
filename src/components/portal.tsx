import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowRight,
  ArrowUpRight,
  FolderKanban,
  LogOut,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { SiteLayout } from "./site-layout";
import { getSupabase } from "../lib/supabase";
import {
  workspaceApi,
  type Project,
  type Profile,
  type Update,
  type Message,
  type Status,
} from "../lib/workspace-api";

type Mode = "client" | "admin";

const statusNames: Record<Status, string> = {
  planning: "Planning",
  in_progress: "In progress",
  review: "In review",
  completed: "Completed",
};
const date = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  )
    return error.message;
  return "Something went wrong. Please try again.";
}

export function Portal({ mode }: { mode: Mode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    try {
      const supabase = getSupabase();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, next) => {
        if (active) {
          setSession(next);
          setReady(true);
        }
      });
      void supabase.auth
        .getSession()
        .then(({ data, error: sessionError }) => {
          if (!active) return;
          if (sessionError) setError(sessionError.message);
          setSession(data.session);
          setReady(true);
        })
        .catch((err: unknown) => {
          if (active) {
            setError(errorText(err));
            setReady(true);
          }
        });
      return () => {
        active = false;
        subscription.unsubscribe();
      };
    } catch (err) {
      setError(errorText(err));
      setReady(true);
      return () => {
        active = false;
      };
    }
  }, []);

  const staff =
    session?.user.app_metadata["role"] === "admin" ||
    session?.user.app_metadata["role"] === "staff";
  return (
    <SiteLayout>
      <main className="portal-page">
        <div className="shell">
          <div className="portal-top">
            <div>
              <p className="kicker">
                ITHEKU TECH / {mode === "admin" ? "ADMIN" : "CLIENT"} WORKSPACE
              </p>
              <h1>{mode === "admin" ? "Your delivery hub." : "Your project, in focus."}</h1>
              <p>
                {mode === "admin"
                  ? "Manage projects, share progress and keep the conversation moving."
                  : "A clearer view of your projects, progress and conversations with our team."}
              </p>
            </div>
            <ShieldCheck size={30} />
          </div>
          {!ready ? (
            <div className="portal-empty">Loading your workspace…</div>
          ) : !session ? (
            <Login error={error} setError={setError} />
          ) : mode === "admin" && !staff ? (
            <div className="portal-empty">
              <h2>Staff access required</h2>
              <p>
                This account does not have access to the admin workspace. Please contact your
                administrator.
              </p>
              <SignOut setError={setError} />
              {error && (
                <p role="alert" className="portal-error">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <Workspace key={`${session.user.id}-${mode}`} session={session} mode={mode} />
          )}
        </div>
      </main>
    </SiteLayout>
  );
}

function Login({ error, setError }: { error: string; setError: (value: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const { error: authError } = await getSupabase().auth.signInWithPassword({
        email: String(form.get("email")).trim(),
        password: String(form.get("password")),
      });
      if (authError) throw authError;
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-card">
      <div className="login-icon">
        <ShieldCheck size={24} />
      </div>
      <p className="kicker">SECURE ACCESS</p>
      <h2>Welcome back.</h2>
      <p>Sign in with the account provided by the iTheku Tech team.</p>
      <form className="portal-form" onSubmit={submit}>
        <label>
          Email address
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="button button-dark" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"} <ArrowRight size={16} />
        </button>
        {error && (
          <p role="alert" className="portal-error">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

function SignOut({ setError }: { setError: (value: string) => void }) {
  async function signOut() {
    try {
      const { error } = await getSupabase().auth.signOut();
      if (error) throw error;
    } catch (err) {
      setError(errorText(err));
    }
  }
  return (
    <button className="portal-link" onClick={() => void signOut()}>
      <LogOut size={15} /> Sign out
    </button>
  );
}

function Workspace({ session, mode }: { session: Session; mode: Mode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [updates, setUpdates] = useState<Update[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const selected = projects.find((project) => project.id === selectedId);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const [projectResult, profileResult] = await Promise.all([
        workspaceApi.projects(),
        mode === "admin" ? workspaceApi.profiles() : Promise.resolve({ profiles: [] }),
      ]);
      const next = projectResult.projects;
      setProjects(next);
      setProfiles(profileResult.profiles);
      setSelectedId((previous) =>
        next.some((project) => project.id === previous) ? previous : (next[0]?.id ?? ""),
      );
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);
  useEffect(() => {
    if (!selectedId) {
      setUpdates([]);
      setMessages([]);
      return;
    }
    let active = true;
    setDetailLoading(true);
    setUpdates([]);
    setMessages([]);
    async function loadDetails() {
      try {
        const activity = await workspaceApi.activity(selectedId);
        if (active) {
          setUpdates(activity.updates);
          setMessages(activity.messages);
        }
      } catch (err) {
        if (active) setError(errorText(err));
      } finally {
        if (active) setDetailLoading(false);
      }
    }
    void loadDetails();
    return () => {
      active = false;
    };
  }, [selectedId, revision]);

  async function action(operation: () => Promise<void>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await operation();
      setNotice(success);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    void action(async () => {
      const data = await workspaceApi.createProject({
        name: String(form.get("name")).trim(),
        client_id: String(form.get("client")),
        description: String(form.get("description")).trim(),
      });
      element.reset();
      if (!(await loadProjects()))
        throw new Error("Project created, but the workspace could not refresh. Use Refresh.");
      setSelectedId(data.id);
    }, "Project created.");
  }
  function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    void action(async () => {
      await workspaceApi.updateProject(selected.id, {
        name: String(form.get("name")).trim(),
        description: String(form.get("description")).trim(),
        status: String(form.get("status")),
        progress: Number(form.get("progress")),
      });
      if (!(await loadProjects()))
        throw new Error("Project saved, but the workspace could not refresh. Use Refresh.");
    }, "Project updated.");
  }
  function addUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    void action(async () => {
      await workspaceApi.addUpdate(selected.id, {
        title: String(form.get("title")).trim(),
        body: String(form.get("body")).trim(),
      });
      element.reset();
      setRevision((value) => value + 1);
    }, "Update published.");
  }
  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    void action(async () => {
      await workspaceApi.sendMessage(selected.id, {
        body: String(form.get("message")).trim(),
      });
      element.reset();
      setRevision((value) => value + 1);
    }, "Message sent.");
  }

  return (
    <div className="workspace">
      <div className="workspace-toolbar">
        <div>
          <span className="online-dot" /> Signed in as {session.user.email}
        </div>
        <div>
          <button
            className="portal-link"
            onClick={() => {
              setError("");
              void loadProjects();
              setRevision((value) => value + 1);
            }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <SignOut setError={setError} />
        </div>
      </div>
      {error && (
        <p role="alert" className="portal-alert">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="portal-success">
          {notice}
        </p>
      )}
      <div className="workspace-grid">
        <aside className="workspace-sidebar">
          <div className="workspace-title">
            <div>
              <p className="kicker">YOUR WORKSPACE</p>
              <h2>Projects</h2>
            </div>
            <FolderKanban size={20} />
          </div>
          {loading ? (
            <p className="muted">Loading projects…</p>
          ) : projects.length === 0 ? (
            <p className="muted">
              No projects yet.{" "}
              {mode === "client"
                ? "Your assigned projects will appear here."
                : "Create a project to get started."}
            </p>
          ) : (
            <div className="project-list">
              {projects.map((project) => (
                <button
                  key={project.id}
                  className={selectedId === project.id ? "project-item active" : "project-item"}
                  onClick={() => {
                    setSelectedId(project.id);
                    setError("");
                    setNotice("");
                  }}
                >
                  <strong>{project.name}</strong>
                  <span>
                    {statusNames[project.status]} <ArrowUpRight size={14} />
                  </span>
                </button>
              ))}
            </div>
          )}
          {mode === "admin" && (
            <details className="create-project">
              <summary>+ Create a project</summary>
              <form className="portal-form" onSubmit={createProject}>
                <label>
                  Project name
                  <input name="name" required maxLength={150} />
                </label>
                <label>
                  Client
                  <select name="client" defaultValue="" required>
                    <option value="" disabled>
                      Select a client
                    </option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.display_name ? `${profile.display_name} — ` : ""}
                        {profile.email || profile.id}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Description
                  <textarea name="description" rows={3} maxLength={5000} />
                </label>
                <button className="button button-dark" disabled={busy}>
                  Create project
                </button>
              </form>
            </details>
          )}
        </aside>
        <div className="workspace-main">
          {selected ? (
            <>
              <section className="project-overview">
                <div className="overview-heading">
                  <div>
                    <p className="kicker">PROJECT OVERVIEW</p>
                    <h2>{selected.name}</h2>
                    <p>{selected.description || "Your project workspace is ready."}</p>
                  </div>
                  <span className="status-pill">{statusNames[selected.status]}</span>
                </div>
                <div className="progress-heading">
                  <span>Overall progress</span>
                  <strong>{selected.progress}%</strong>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${selected.progress}%` }} />
                </div>
                <p className="muted">Created {date(selected.created_at)}</p>
                {mode === "admin" && (
                  <form className="progress-form" key={selected.id} onSubmit={saveProject}>
                    <label className="progress-full">
                      Project name
                      <input name="name" defaultValue={selected.name} maxLength={150} required />
                    </label>
                    <label className="progress-full">
                      Description
                      <textarea
                        name="description"
                        defaultValue={selected.description}
                        maxLength={5000}
                        rows={3}
                      />
                    </label>
                    <label>
                      Status
                      <select name="status" defaultValue={selected.status}>
                        {Object.entries(statusNames).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Progress (%)
                      <input
                        type="number"
                        name="progress"
                        min={0}
                        max={100}
                        defaultValue={selected.progress}
                        required
                      />
                    </label>
                    <button className="button button-dark" disabled={busy}>
                      Save project
                    </button>
                  </form>
                )}
              </section>
              {detailLoading ? (
                <div className="portal-panel">Loading project activity…</div>
              ) : (
                <div className="activity-grid">
                  <section className="portal-panel">
                    <div className="panel-title">
                      <div>
                        <p className="kicker">THE LATEST</p>
                        <h3>Delivery updates</h3>
                      </div>
                      <ArrowUpRight size={19} />
                    </div>
                    {updates.length ? (
                      <div className="updates-list">
                        {updates.map((update) => (
                          <article key={update.id}>
                            <span>{date(update.created_at)}</span>
                            <h4>{update.title}</h4>
                            <p>{update.body}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">No updates published yet.</p>
                    )}
                    {mode === "admin" && (
                      <details className="portal-details">
                        <summary>+ Publish an update</summary>
                        <form className="portal-form" onSubmit={addUpdate}>
                          <label>
                            Title
                            <input name="title" maxLength={150} required />
                          </label>
                          <label>
                            Update
                            <textarea name="body" maxLength={5000} rows={4} required />
                          </label>
                          <button className="button button-dark" disabled={busy}>
                            Publish update
                          </button>
                        </form>
                      </details>
                    )}
                  </section>
                  <section className="portal-panel">
                    <div className="panel-title">
                      <div>
                        <p className="kicker">STAY CONNECTED</p>
                        <h3>Conversation</h3>
                      </div>
                      <MessageSquare size={19} />
                    </div>
                    <div className="messages">
                      {messages.length ? (
                        messages.map((message) => (
                          <article
                            key={message.id}
                            className={
                              message.sender_id === session.user.id ? "message mine" : "message"
                            }
                          >
                            <span>
                              {message.sender_id === session.user.id
                                ? "You"
                                : mode === "client"
                                  ? "iTheku team"
                                  : "Project participant"}{" "}
                              · {date(message.created_at)}
                            </span>
                            <p>{message.body}</p>
                          </article>
                        ))
                      ) : (
                        <p className="muted">Start a conversation about this project.</p>
                      )}
                    </div>
                    <form className="portal-form" onSubmit={sendMessage}>
                      <label>
                        Message
                        <textarea
                          name="message"
                          rows={3}
                          maxLength={5000}
                          required
                          placeholder="Write a message…"
                        />
                      </label>
                      <button className="button button-dark" disabled={busy}>
                        Send message <ArrowRight size={15} />
                      </button>
                    </form>
                  </section>
                </div>
              )}
            </>
          ) : (
            <div className="portal-empty">
              <FolderKanban size={28} />
              <h2>Your workspace starts here.</h2>
              <p>Select a project to see its progress, updates and conversation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
