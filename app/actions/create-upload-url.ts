"use server";

import { getSupabaseServer } from "@/lib/supabase-server";

const BUCKET = "merchant-documents";

export type FileCategory = "bank_statements" | "void_check" | "drivers_license";

export interface CreateUploadUrlRequest {
  fileName: string;
  fileType: string;
  category: FileCategory;
  fileSize: number;
}

export interface CreateUploadUrlResult {
  success: boolean;
  data?: {
    token: string;
    path: string;
    signedUrl: string;
  };
  error?: string;
}

/**
 * Create a presigned upload URL for direct client-to-Supabase file uploads.
 * This bypasses Vercel's 4.5MB serverless function body size limit.
 */
export async function createUploadUrl(
  request: CreateUploadUrlRequest
): Promise<CreateUploadUrlResult> {
  try {
    const { fileName, fileType, category, fileSize } = request;

    // Validate inputs
    if (!fileName || !fileType || !category) {
      return { success: false, error: "Missing required fields." };
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "text/csv",
    ];
    if (!allowedTypes.includes(fileType)) {
      return {
        success: false,
        error: `File type ${fileType} is not allowed. Accepted types: PDF, JPG, JPEG, GIF, CSV.`,
      };
    }

    // Validate category
    const validCategories: FileCategory[] = [
      "bank_statements",
      "void_check",
      "drivers_license",
    ];
    if (!validCategories.includes(category)) {
      return { success: false, error: "Invalid document category." };
    }

    // Generate unique storage path
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `temp/${category}/${timestamp}-${randomString}-${safeName}`;

    // Create presigned upload URL
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error) {
      console.error("Failed to create presigned upload URL:", error);
      return {
        success: false,
        error: error.message || "Failed to create upload URL.",
      };
    }

    if (!data) {
      return { success: false, error: "No data returned from Supabase." };
    }

    return {
      success: true,
      data: {
        token: data.token,
        path: storagePath,
        signedUrl: data.signedUrl,
      },
    };
  } catch (err) {
    console.error("createUploadUrl error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
