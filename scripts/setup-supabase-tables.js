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
  if (!fs.existsSync(sqlPath)) {
    console.error("SQL file not found:", sqlPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, "utf8");
  const abandonedSql = fs.existsSync(abandonedSqlPath)
    ? fs.readFileSync(abandonedSqlPath, "utf8")
    : null;

  if (SUPABASE_DB_URL) {
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
    } catch (err) {
      console.error("Database error:", err.message);
      process.exit(1);
    } finally {
      await client.end();
    }
  } else {
    console.log(
      "SUPABASE_DB_URL not set. Create tables manually: Supabase Dashboard → SQL Editor → run:"
    );
    console.log("  " + sqlPath);
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
