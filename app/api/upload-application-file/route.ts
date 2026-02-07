import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

const BUCKET = "merchant-documents";

/** Max body size per request (Vercel limit 4.5 MB); allow one file up to 4 MB. */
const MAX_FILE_BYTES = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const uploadId = formData.get("uploadId");
    const type = formData.get("type");
    const fileName = formData.get("fileName");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Missing or empty file." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds 4 MB per file.` },
        { status: 400 }
      );
    }
    if (typeof uploadId !== "string" || !/^[0-9a-f-]{36}$/i.test(uploadId)) {
      return NextResponse.json({ error: "Invalid uploadId." }, { status: 400 });
    }
    const allowedTypes = ["bank_statements", "void_check", "drivers_license"];
    if (typeof type !== "string" || !allowedTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid type." }, { status: 400 });
    }
    if (typeof fileName !== "string" || !fileName.trim()) {
      return NextResponse.json({ error: "Invalid fileName." }, { status: 400 });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").trim() || "file";
    const path = `pending/${uploadId}/${type}/${safeName}`;

    const supabase = getSupabaseServer();
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) {
      console.error("[upload-application-file] Storage upload error:", error);
      return NextResponse.json({ error: error.message || "Upload failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, path });
  } catch (err) {
    console.error("[upload-application-file] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 500 }
    );
  }
}
