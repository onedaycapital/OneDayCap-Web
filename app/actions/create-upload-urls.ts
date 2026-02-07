"use server";

export type DocumentFileType = "bank_statements" | "void_check" | "drivers_license";

export interface UploadSlot {
  type: DocumentFileType;
  fileName: string;
  path: string;
}

export interface CreateUploadUrlsResult {
  uploadId: string;
  uploads: UploadSlot[];
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Create an upload session: returns uploadId and paths. Client uploads each file
 * to POST /api/upload-application-file (one file per request, avoids CORS and 4.5 MB total limit).
 * Files go to pending/{uploadId}/{type}/{fileName}. After submit, the server
 * moves them to {applicationId}/{type}/ and deletes the pending folder.
 */
export async function createUploadSession(
  files: { type: DocumentFileType; fileName: string }[]
): Promise<CreateUploadUrlsResult | { error: string }> {
  if (files.length === 0) {
    return { error: "No files to upload." };
  }
  const uploadId = crypto.randomUUID();
  const uploads: UploadSlot[] = [];

  for (const { type, fileName } of files) {
    const safeName = safeFileName(fileName);
    const path = `pending/${uploadId}/${type}/${safeName}`;
    uploads.push({ type, fileName, path });
  }

  return { uploadId, uploads };
}
