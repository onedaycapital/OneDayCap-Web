"use server";

import { getSupabaseServer } from "@/lib/supabase-server";

const BUCKET = "merchant-documents";

/**
 * Delete an uploaded file from Supabase storage.
 * Used for cleanup when:
 * - User removes a file before submission
 * - Submission fails
 * - User abandons the form
 */
export async function deleteUploadedFile(
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!storagePath) {
      return { success: false, error: "Storage path is required." };
    }

    const supabase = getSupabaseServer();
    const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);

    if (error) {
      console.error("Failed to delete file:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("deleteUploadedFile error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Delete multiple uploaded files from Supabase storage.
 * Used for batch cleanup operations.
 */
export async function deleteMultipleFiles(
  storagePaths: string[]
): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
  try {
    if (!storagePaths || storagePaths.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .remove(storagePaths);

    if (error) {
      console.error("Failed to delete files:", error);
      return { success: false, error: error.message };
    }

    return { success: true, deletedCount: data?.length || 0 };
  } catch (err) {
    console.error("deleteMultipleFiles error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
