# iTheku Tech

A TanStack Start business website with an Express API, a 13-service catalogue,
project enquiry form, and authenticated client and staff project workspaces.

## Local setup

1. Install dependencies with `npm install` (or use the existing Bun lockfile).
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`.
   The lead server function also accepts `SUPABASE_URL` and
   `SUPABASE_PUBLISHABLE_KEY` as runtime variables. Use the project URL and
   public/publishable key, **not** the service-role key.
3. Review and apply the migrations in order using the Supabase SQL Editor or
   your normal migration process:
   - [Public leads](supabase/migrations/20261113000000_public_leads.sql)
   - [Project workspaces](supabase/migrations/20261113000001_platform_workspaces.sql)
4. Run `npm run dev`. Open the URL printed by Vite.

The migrations create separate `public_leads` and `platform_*` tables; they
do not modify or migrate data from any existing lead or portal tables. Review
names and policies against the deployed project before applying them. The
Supabase instance must expose the `public` schema through its Data API.

## Client and staff workspaces

Create users in Supabase Auth and provide their sign-in credentials through
your usual secure onboarding process. The workspace migration creates profiles
for existing users and keeps profiles in sync for new Auth users. Clients sign
in at `/client-portal`; staff sign in at `/admin-portal`.

To grant a staff account access, set the **trusted app metadata** role from the
Supabase SQL Editor, replacing the email:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'staff@example.com';
```

The `admin` and `staff` roles both have staff access. After changing a role,
the user must sign out and back in to refresh the access token. Never assign
roles through user-editable metadata. Staff can create projects, assign an
existing Auth user, change status and progress, publish updates, and send
messages. Clients can see only their assigned projects, read updates, and
participate in their project conversations. RLS enforces those permissions
independently of the interface. Use the Refresh button to fetch new activity;
the workspace does not currently push real-time updates.

Supabase Auth handles sign-in in the browser. Project and conversation requests
go through the same-origin Express API under `/api`; the API verifies the user's
access token with Supabase and forwards that token to the database so RLS
continues to enforce project access. The API does not use a service-role key.

Before launch, test with at least two client accounts and one staff account:
verify each client cannot read the other's projects or messages, cannot create
projects or updates, and cannot impersonate another sender. Also test staff
project creation, edits, progress updates, publishing and messaging. A project
cannot be reassigned through the app or authenticated API: create a new project
for a different client so old conversations are not exposed to them.

## Lead submissions

The form uses the TanStack server function, which passes requests to Express.
Validation runs on the client and server. The database function also
validates inputs because it is callable with a public key. It allows up to
three submissions per email per hour and uses a request ID for idempotent
retries. Anonymous and authenticated users cannot read the lead table;
service-role management can review submissions in the Supabase dashboard.
Email rate limiting alone is not a complete anti-spam solution: consider
additional network-level protection before public launch.

## Deploy to Vercel

1. Import the repository into Vercel and use `npm run build` as the build
   command. Vite uses Nitro's Vercel preset, which deploys the Express API and
   TanStack application together as a Node server function.
2. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the
   relevant Vercel environments. Optionally also configure `SUPABASE_URL` and
   `SUPABASE_PUBLISHABLE_KEY` for the lead server function at runtime.
3. Apply and verify both migrations, deploy, submit a test enquiry, and test
   the client and staff flows with separate accounts.
4. Confirm the [service content](src/data/services.ts) before launch. The
   optimized logo mark is served as a Vercel static asset. The homepage workspace illustration is
   a concept, not a claim about a delivered customer project.

Keep service-role credentials out of browser-exposed `VITE_` variables and out
of source control. The local `.env` is tracked in this checkout: review it
before sharing or committing changes and rotate any credentials that have
been exposed.
