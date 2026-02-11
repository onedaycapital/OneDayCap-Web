# Supabase projects and OneDayCap website

The OneDayCap website uses **one** Supabase project:

| Project       | Use for this website |
|---------------|----------------------|
| **Merchant DB** | Yes. All app data: staging, merchant_applications, application_sessions, contact_activity, storage, etc. Use this project for SQL scripts, env vars, and Table Editor. |
| **WatermarkFile** | No. Do not use or modify this project for the OneDayCap website. |

- **Env vars** (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) must point at **Merchant DB**.
- **SQL scripts** in `docs/supabase-*.sql` are intended to be run in **Merchant DB** → SQL Editor.
- **WatermarkFile** is a separate project and is not touched by this codebase.
