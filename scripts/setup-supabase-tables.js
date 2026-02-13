/**
 * One-time setup: create merchant_applications + merchant_application_files tables
 * and the merchant-documents storage bucket in Supabase.
 *
 * Prerequisites:
 *   1. In .env.local you need:
 *      - NEXT_PUBLIC_SUPABASE_URL
 *      - SUPABASE_SERVICE_ROLE_KEY
 *      - SUPABASE_DB_URL (Database connection string from Supabase Dashboard
 *        → Project Settings → Database → Connection string → URI)
 *   2. Install pg:  npm install --save-dev pg
 *
 * Run:  node scripts/setup-supabase-tables.js
 */

require("./load-env-local");

const fs = require("fs");
const path = require("path");

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getDbHost(url) {
  if (!url) return null;
  try {
    const u = new URL(url.replace(/^postgresql:\/\//, "https://"));
    return u.hostname;
  } catch {
    return null;
  }
}

async function runSql(client, sql) {
  return new Promise((resolve, reject) => {
    client.query(sql, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

async function main() {
  const sqlPath = path.resolve(__dirname, "..", "docs", "supabase-merchant-applications.sql");
  const abandonedSqlPath = path.resolve(__dirname, "..", "docs", "supabase-abandoned-application-progress.sql");
  const funderSqlPath = path.resolve(__dirname, "..", "docs", "supabase-funder-schema.sql");
  if (!fs.existsSync(sqlPath)) {
    console.error("SQL file not found:", sqlPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, "utf8");
  const abandonedSql = fs.existsSync(abandonedSqlPath)
    ? fs.readFileSync(abandonedSqlPath, "utf8")
    : null;
  const funderSql = fs.existsSync(funderSqlPath)
    ? fs.readFileSync(funderSqlPath, "utf8")
    : null;

  if (SUPABASE_DB_URL) {
    const dbHost = getDbHost(SUPABASE_DB_URL);
    if (dbHost) console.log("Connecting to DB host:", dbHost);

    let pg;
    try {
      pg = require("pg");
    } catch (e) {
      console.error(
        "Install pg first:  npm install --save-dev pg\n",
        e.message
      );
      process.exit(1);
    }
    const client = new pg.Client({ connectionString: SUPABASE_DB_URL });
    try {
      await client.connect();
      await runSql(client, sql);
      console.log("Tables created/updated: merchant_applications, merchant_application_files");
      if (abandonedSql) {
        await runSql(client, abandonedSql);
        console.log("Table created/updated: abandoned_application_progress");
      }
      if (funderSql) {
        await runSql(client, funderSql);
        console.log("Funder schema created/updated: funders, funder_submissions, submission_messages, etc.");
      }
    } catch (err) {
      console.error("Database error:", err.message);
      if (err.code === "ENOTFOUND" || (err.message && err.message.includes("ENOTFOUND"))) {
        console.error("\nTip: ENOTFOUND means the DB host could not be resolved.");
        console.error("  • Supabase project may be paused (Dashboard → Project → Restore).");
        console.error("  • Or copy the connection string again: Project Settings → Database → Connection string → URI.");
      }
      process.exit(1);
    } finally {
      await client.end();
    }
  } else {
    console.log(
      "SUPABASE_DB_URL not set. Create tables manually: Supabase Dashboard → SQL Editor → run:"
    );
    console.log("  " + sqlPath);
    if (funderSql) console.log("  " + funderSqlPath);
  }

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: buckets } = await supabase.storage.listBuckets();
    const hasBucket = (buckets || []).some((b) => b.name === "merchant-documents");
    if (!hasBucket) {
      const { error } = await supabase.storage.createBucket("merchant-documents", {
        public: false,
      });
      if (error) {
        console.warn("Storage bucket creation failed (you can create it in Dashboard):", error.message);
      } else {
        console.log("Storage bucket created: merchant-documents");
      }
    } else {
      console.log("Storage bucket merchant-documents already exists");
    }
  }

  console.log("Setup done.");
}

main();
