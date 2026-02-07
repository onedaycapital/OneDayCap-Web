"use client";

import { getSupabaseClient } from "@/lib/supabase-client";
import {
  createUploadUrl,
  type FileCategory,
  type CreateUploadUrlResult,
} from "@/app/actions/create-upload-url";

export interface UploadedFileMetadata {
  storage_path: string;
  file_name: string;
  file_size: number;
  content_type: string;
  uploaded_at: string;
}

export interface UploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: "uploading" | "success" | "error";
  error?: string;
}

export interface UploadResult {
  success: boolean;
  metadata?: UploadedFileMetadata;
  error?: string;
}

/**
 * Upload a single file to Supabase Storage using a presigned URL.
 * This bypasses Vercel's serverless function body size limit.
 *
 * @param file - The file to upload
 * @param category - The document category (bank_statements, void_check, drivers_license)
 * @param onProgress - Optional callback for upload progress updates
 * @returns Upload result with metadata or error
 */
export async function uploadFileToSupabase(
  file: File,
  category: FileCategory,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Notify start of upload
    onProgress?.({
      fileName: file.name,
      progress: 0,
      status: "uploading",
    });

    // Step 1: Request presigned upload URL from server
    const urlResult: CreateUploadUrlResult = await createUploadUrl({
      fileName: file.name,
      fileType: file.type,
      category,
      fileSize: file.size,
    });

    if (!urlResult.success || !urlResult.data) {
      const error = urlResult.error || "Failed to get upload URL";
      onProgress?.({
        fileName: file.name,
        progress: 0,
        status: "error",
        error,
      });
      return { success: false, error };
    }

    const { token, path, signedUrl } = urlResult.data;

    // Update progress
    onProgress?.({
      fileName: file.name,
      progress: 10,
      status: "uploading",
    });

    // Step 2: Upload file directly to Supabase using presigned URL
    const supabase = getSupabaseClient();
    const { error: uploadError } = await supabase.storage
      .from("merchant-documents")
      .uploadToSignedUrl(path, token, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      const error = uploadError.message || "Upload failed";
      onProgress?.({
        fileName: file.name,
        progress: 0,
        status: "error",
        error,
      });
      return { success: false, error };
    }

    // Success - notify 100% progress
    onProgress?.({
      fileName: file.name,
      progress: 100,
      status: "success",
    });

    // Return metadata
    const metadata: UploadedFileMetadata = {
      storage_path: path,
      file_name: file.name,
      file_size: file.size,
      content_type: file.type,
      uploaded_at: new Date().toISOString(),
    };

    return { success: true, metadata };
  } catch (err) {
    console.error("uploadFileToSupabase error:", err);
    const error = err instanceof Error ? err.message : "Unknown upload error";
    onProgress?.({
      fileName: file.name,
      progress: 0,
      status: "error",
      error,
    });
    return { success: false, error };
  }
}

/**
 * Upload multiple files concurrently with progress tracking.
 *
 * @param files - Array of files to upload
 * @param category - The document category for all files
 * @param onProgress - Optional callback for individual file progress updates
 * @returns Array of upload results
 */
export async function uploadMultipleFiles(
  files: File[],
  category: FileCategory,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult[]> {
  // Upload all files concurrently
  const uploadPromises = files.map((file) =>
    uploadFileToSupabase(file, category, onProgress)
  );

  return await Promise.all(uploadPromises);
}

/**
 * Validate file type against allowed types.
 *
 * @param file - The file to validate
 * @returns true if valid, error message if invalid
 */
export function validateFileType(file: File): string | true {
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "text/csv",
  ];

  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".gif", ".csv"];

  // Check MIME type
  if (allowedTypes.includes(file.type)) {
    return true;
  }

  // Fallback: check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some((ext) =>
    fileName.endsWith(ext)
  );

  if (hasValidExtension) {
    return true;
  }

  return "Invalid file type. Accepted: PDF, JPG, JPEG, GIF, CSV.";
}

/**
 * Format file size for display.
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}
