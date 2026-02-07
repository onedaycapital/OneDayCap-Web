# Staging table lookup (application form prefill)

When a user enters their email on Step 1 and clicks Next, the app looks up that email in your **Staging** table (in the same Supabase project). If a row matches, the form is prefilled with that merchant’s data.

## Recommended: use the RPC (99% consistency)

The app tries **two paths**:

1. **RPC first** – Calls `get_staging_merchant_by_email(lookup_email)`. One DB round-trip, no column-name guessing. **Use this for reliable prefill.**
2. **Client fallback** – If the RPC doesn’t exist, the app queries the table directly (tries many column name variants). Works with different schemas but is more brittle.

**To get 99% consistent lookups:**

1. Create the Staging table with the standard schema: run **`docs/supabase-staging.sql`** in the Supabase SQL Editor.
2. Create the lookup function: run **`docs/supabase-staging-lookup-rpc.sql`** in the Supabase SQL Editor.
3. Ensure at least one of the email columns (e.g. **Email 1**) contains the test email (case-insensitive match).

After that, the app will use the RPC and prefilling will be reliable. If you use a different table/schema, the client fallback will still run but may miss rows if column names don’t match.

## Table name

- **Default:** `staging` (lowercase). Postgres lowercases unquoted identifiers, so a table created as `CREATE TABLE Staging` is stored as `staging`.
- **Override:** Set `SUPABASE_STAGING_TABLE` in `.env.local` to match your table name (e.g. `Staging` if you created it with quotes). The code tries both the env value and the opposite case.

## Where we look for the email

We match the user’s email (case-insensitive) against these columns, in order, and use the first row that matches:

- Email 1, Email 2, Email 3, Email 4, Email 5, Email 6  
- Owner 2 Email 1, Owner 2 Email 2, Owner 2 Email 3, Owner 2 Email 4, Owner 2 Email 5  

Column names can be with spaces and any case (e.g. `Email 1` or `email 1`); the lookup tries both.

## Columns we read (form prefill)

For each form field we try **several column name variants** (with spaces, lowercase, snake_case, camelCase), so your table can use any of these styles. We also try common alternates (e.g. "Phone" for "Phone 1", "Address" for "Address Street").

| Form section   | Primary Staging column(s) | Also tries |
|----------------|---------------------------|------------|
| Personal       | First Name, Last Name, Phone 1 | Phone |
| Business       | Business Name, Business Start Date, EIN, Address Street, City, State, ZIP, Business Type | Address, Street, Zip, Industry |
| Financial      | Monthly Revenue           | Revenue |
| Credit/Ownership | Home Address, City 2, State 2, ZIP 2 | Owner Address, Owner City, Owner State, Owner Zip |

SSN is never read from Staging.

## If lookup doesn’t work

1. **Check the “Lookup note” on the form**  
   After clicking Next on Step 1, if no row is found you’ll see a message (e.g. the first Supabase error or “No matching row in Staging for this email.”).

2. **Check server logs**  
   Run `npm run dev` and watch the terminal. Look for `Staging lookup [tablename] (column): ...` to see which table/column was tried and any error.

3. **Confirm table and columns in Supabase**  
   In Supabase → Table Editor, open your Staging table and verify:
   - The table exists and is in the `public` schema.
   - At least one of the email columns (e.g. “Email 1”) exists and contains the test email.
   - Column names match the list above (spaces and case are OK; we normalize).

4. **Env**  
   Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set so the server can reach Supabase. Optionally set `SUPABASE_STAGING_TABLE` if your table name is different (e.g. `Staging`).
