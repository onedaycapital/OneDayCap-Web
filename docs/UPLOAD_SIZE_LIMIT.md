# Upload size and large-file support

- **Vercel** serverless has a **4.5 MB request body limit** per request.
- The application form uses **per-file API upload**: each file is sent in its own `POST /api/upload-application-file` request (so each request is one file, under 4.5 MB). Then the form submit sends only **upload session id + paths** (no file bytes). This avoids CORS (no direct browser → Supabase Storage) and supports many/large files.
- **Per-file limit:** 4 MB per file (enforced in the API route and in the client). Total number of files is effectively unlimited (bank statements + void check + driver’s license).
- No `NEXT_PUBLIC_SUPABASE_ANON_KEY` is required for uploads; the API route uses the server-side service role.
