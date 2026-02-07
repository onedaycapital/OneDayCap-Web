# Large File Upload Implementation

This document provides an overview of the large file upload feature that bypasses Vercel's 4.5MB serverless function body size limit.

## Problem Solved

Vercel serverless functions have a hard 4.5MB request body limit. Previously, files were uploaded through Next.js server actions, which would fail for files larger than 4.5MB. This implementation allows uploading files of any size (up to 5GB) directly to Supabase Storage.

## Architecture

The implementation uses **presigned URLs** to enable direct client-to-Supabase uploads:

```
User selects file → Request presigned URL → Upload directly to Supabase → Track metadata → Submit form with metadata
```

### Flow Diagram

1. **User Action**: User selects a file in the form
2. **Client Request**: Browser requests a presigned upload URL from server action
3. **Server Response**: Server generates temporary upload URL (valid 2 hours)
4. **Direct Upload**: Browser uploads file directly to Supabase Storage
5. **Metadata Storage**: Client tracks uploaded file metadata locally
6. **Form Submission**: Only file metadata is sent to server (not files)
7. **File Linking**: Server links pre-uploaded files to the application record

## Key Components

### 1. Client-Side Supabase Client
**File**: `lib/supabase-client.ts`

Browser-safe Supabase client using the public anon key for client-side uploads.

```typescript
import { getSupabaseClient } from "@/lib/supabase-client";
const supabase = getSupabaseClient();
```

### 2. Presigned URL Server Action
**File**: `app/actions/create-upload-url.ts`

Generates temporary upload URLs that expire after 2 hours.

```typescript
import { createUploadUrl } from "@/app/actions/create-upload-url";

const result = await createUploadUrl({
  fileName: "statement.pdf",
  fileType: "application/pdf",
  category: "bank_statements",
  fileSize: 5000000, // 5MB
});
```

### 3. Upload Helper Utilities
**File**: `lib/upload-helpers.ts`

Client-side functions for uploading files with progress tracking.

```typescript
import { uploadFileToSupabase } from "@/lib/upload-helpers";

const result = await uploadFileToSupabase(
  file,
  "bank_statements",
  (progress) => {
    console.log(`${progress.fileName}: ${progress.progress}%`);
  }
);
```

### 4. Updated Form Types
**File**: `components/apply-form/types.ts`

New types for tracking uploaded file metadata instead of File objects.

```typescript
interface UploadedFileMetadata {
  storage_path: string;
  file_name: string;
  file_size: number;
  content_type: string;
  uploaded_at: string;
}

interface DocumentUploads {
  bankStatements: UploadedFileMetadata[];
  voidCheck: UploadedFileMetadata | null;
  driversLicense: UploadedFileMetadata | null;
}
```

### 5. Refactored Step 5 Component
**File**: `components/apply-form/steps/Step5DocumentsAndSignature.tsx`

Updated UI with:
- Immediate upload on file selection
- Real-time progress bars
- Success indicators with file info
- Remove file functionality
- Error handling with retry

### 6. Updated Submit Handler
**File**: `components/apply-form/ApplicationForm.tsx`

Modified to send file metadata instead of files themselves.

### 7. Updated Submit Action
**File**: `app/actions/submit-application.ts`

Server action now:
- Receives file metadata instead of files
- Moves files from `temp/` to final `{applicationId}/` location
- Downloads files from storage for email attachments
- Creates database records linking files to application

### 8. Cleanup Action
**File**: `app/actions/cleanup-uploads.ts`

Server action to delete uploaded files when:
- User removes a file before submission
- Submission fails
- Form is abandoned

## File Storage Structure

```
merchant-documents/
├── temp/                          # Temporary uploads
│   ├── bank_statements/
│   │   └── {timestamp}-{random}-{filename}
│   ├── void_check/
│   │   └── {timestamp}-{random}-{filename}
│   └── drivers_license/
│       └── {timestamp}-{random}-{filename}
│
└── {applicationId}/               # Finalized files (after submission)
    ├── bank_statements/
    │   └── {timestamp}-{random}-{filename}
    ├── void_check/
    │   └── {timestamp}-{random}-{filename}
    ├── drivers_license/
    │   └── {timestamp}-{random}-{filename}
    └── application/
        └── {businessName}_OneDayCap_Application.pdf
```

## Environment Variables

Add to `.env.local`:

```bash
# Required for client-side uploads
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Required for server-side operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get these from: Supabase Dashboard → Project Settings → API

## Supabase Setup

### 1. Create Storage Bucket

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'merchant-documents',
  'merchant-documents',
  false,
  5368709120, -- 5GB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/gif', 'text/csv']
);
```

### 2. Configure RLS Policies

See `docs/supabase-storage-policies.sql` for complete policy setup.

Key policies:
- Allow presigned uploads (authenticated/anon)
- Allow service role full access
- Restrict public downloads

### 3. Configure CORS

In Supabase Dashboard → Storage → Configuration:

- **Allowed Origins**: Your domain(s) + localhost
- **Allowed Methods**: GET, POST, PUT, DELETE
- **Allowed Headers**: authorization, x-client-info, apikey, content-type

## Features

### ✅ Unlimited File Size
- Supports files up to 5GB (Supabase limit)
- No Vercel serverless function limit

### ✅ Progress Tracking
- Real-time upload progress bars
- File-by-file progress for multiple uploads

### ✅ User Experience
- Immediate feedback on file selection
- Success indicators with file details
- Remove and retry functionality
- Clear error messages

### ✅ Security
- Presigned URLs expire after 2 hours
- Unique storage paths prevent collisions
- File type validation (client + server)
- Private storage (not publicly accessible)

### ✅ Email Attachments
- Files downloaded from storage for email
- All uploaded documents included
- Application PDF generated and attached

## Usage

### For Users

1. Fill out application form steps 1-4
2. On Step 5, click file inputs to select documents
3. Files upload automatically on selection
4. Wait for green checkmarks before proceeding
5. Remove and reupload if needed
6. Complete signature and submit

### For Developers

**Upload a file**:
```typescript
import { uploadFileToSupabase } from "@/lib/upload-helpers";

const result = await uploadFileToSupabase(
  file,
  "bank_statements",
  (progress) => console.log(progress)
);

if (result.success) {
  console.log("Uploaded:", result.metadata);
}
```

**Delete a file**:
```typescript
import { deleteUploadedFile } from "@/app/actions/cleanup-uploads";

await deleteUploadedFile(storagePath);
```

## Testing

See `docs/TESTING_LARGE_FILE_UPLOAD.md` for comprehensive testing guide.

Quick test checklist:
- ✅ Upload < 1MB file (baseline)
- ✅ Upload 5-10MB file (above Vercel limit)
- ✅ Upload 50-100MB file (large file)
- ✅ Upload multiple files concurrently
- ✅ Remove file before submission
- ✅ Submit form and verify emails

## Limitations

1. **Maximum file size**: 5GB per file (Supabase limit)
2. **Presigned URL expiry**: 2 hours
3. **Concurrent uploads**: Limited by browser (typically 6)
4. **Progress accuracy**: Basic increments, not real-time byte tracking
5. **Temp file cleanup**: Manual or automated cleanup needed

## Future Enhancements

### 1. TUS Resumable Uploads
For files > 6MB, implement resumable uploads:
- Automatically resume after network interruption
- Better reliability for large files
- Uses Supabase TUS endpoint

### 2. Automated Temp Cleanup
Create Edge Function or cron job:
```sql
DELETE FROM storage.objects
WHERE bucket_id = 'merchant-documents'
  AND name LIKE 'temp/%'
  AND created_at < NOW() - INTERVAL '24 hours';
```

### 3. Real-Time Progress
Implement xhr/fetch with progress events for accurate byte-level progress tracking.

### 4. File Compression
Client-side compression for images before upload to reduce size and bandwidth.

### 5. Virus Scanning
Integrate ClamAV or similar for uploaded file scanning.

## Troubleshooting

### CORS Error
- Verify Supabase CORS configuration includes your domain
- Check browser console for specific CORS error details

### 401 Unauthorized
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly
- Check RLS policies allow uploads

### Files Not in Email
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set (server-side)
- Check server logs for file download errors
- Verify files exist at expected storage path

### Upload Stuck at 0%
- Check network connectivity
- Verify presigned URL is valid (not expired)
- Check browser console for errors

## Support

For issues or questions:
1. Check browser console for errors
2. Review server logs for detailed error messages
3. Verify environment variables are set correctly
4. Consult `docs/supabase-storage-policies.sql` for setup
5. See `docs/TESTING_LARGE_FILE_UPLOAD.md` for testing guidance

## References

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Vercel Serverless Function Limits](https://vercel.com/docs/errors/FUNCTION_PAYLOAD_TOO_LARGE)
- [Presigned URLs Guide](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)
