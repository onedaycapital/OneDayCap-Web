# Large File Upload Implementation - Testing Guide

This document outlines the testing process for the large file upload feature implementation.

## Prerequisites

1. **Environment Setup**: Ensure `.env.local` has the required Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   RESEND_API_KEY=your-resend-api-key
   ```

2. **Supabase Storage**: 
   - Bucket `merchant-documents` must exist
   - RLS policies configured (see `docs/supabase-storage-policies.sql`)
   - CORS configured to allow your domain

3. **Dev Server**: Running on port 3001 (or your configured port)

## Test Cases

### 1. Small File Upload (< 1MB) - Baseline Test
**Purpose**: Verify basic upload functionality works

**Steps**:
1. Navigate to `/processing-application` or `/application`
2. Fill out steps 1-4 of the form
3. On Step 5, select a small PDF file (< 1MB)
4. Verify:
   - Upload progress bar appears
   - File shows as uploaded with green checkmark
   - File name and size display correctly
   - Can remove and re-upload the file

**Expected Result**: ✅ Upload completes successfully in < 2 seconds

---

### 2. Medium File Upload (5-10MB) - Above Vercel Limit
**Purpose**: Verify files above Vercel's 4.5MB limit can be uploaded

**Steps**:
1. Navigate to Step 5
2. Select a PDF or image file between 5-10MB
3. Monitor upload progress
4. Verify file uploads successfully

**Expected Result**: ✅ Upload completes successfully, bypassing Vercel's 4.5MB limit

---

### 3. Large File Upload (50-100MB)
**Purpose**: Verify truly large files work without issues

**Steps**:
1. Navigate to Step 5
2. Select a file between 50-100MB
3. Monitor upload progress bar
4. Verify upload completes

**Expected Result**: ✅ Upload completes (may take 30-60 seconds depending on connection)

**Note**: Files up to 5GB are supported via standard Supabase uploads

---

### 4. Multiple Bank Statements
**Purpose**: Verify multiple file uploads work concurrently

**Steps**:
1. Navigate to Step 5
2. Select 3-5 bank statement files at once (various sizes)
3. Observe progress bars for each file
4. Verify all files upload successfully

**Expected Result**: ✅ All files upload successfully, can see individual progress

---

### 5. File Removal Before Submission
**Purpose**: Verify file cleanup works correctly

**Steps**:
1. Upload a file to any category
2. Click the "X" button to remove it
3. Check browser console for errors
4. Verify file is removed from UI
5. Upload a different file to replace it

**Expected Result**: ✅ File removed from storage and UI without errors

---

### 6. Complete Form Submission
**Purpose**: End-to-end test of the entire flow

**Steps**:
1. Complete all form steps with uploaded files
2. Sign the signature pad
3. Submit the application
4. Verify redirect to processing page
5. Check email for:
   - Merchant confirmation email with PDF
   - Internal email with PDF + all uploaded files

**Expected Result**: 
- ✅ Submission succeeds
- ✅ Files moved from `temp/` to `{applicationId}/` in storage
- ✅ Database records created in `merchant_application_files`
- ✅ Emails sent with correct attachments

---

### 7. Upload Error Handling
**Purpose**: Verify error states are handled gracefully

**Steps**:
1. Turn off internet connection
2. Attempt to upload a file
3. Verify error message displays
4. Reconnect internet
5. Retry upload

**Expected Result**: ✅ Clear error message shown, retry works

---

### 8. Invalid File Type
**Purpose**: Verify file type validation works

**Steps**:
1. Try to upload a `.exe` or `.zip` file
2. Verify error message appears

**Expected Result**: ✅ Upload rejected with message about accepted file types

---

### 9. Form Abandonment Cleanup
**Purpose**: Verify orphaned files are handled correctly

**Steps**:
1. Upload files to Step 5
2. Close browser tab without submitting
3. Check Supabase storage `temp/` folder
4. Files should remain (manual cleanup needed)

**Expected Result**: ✅ Files remain in temp/ for later cleanup

**Note**: Implement automated cleanup via cron job or Edge Function

---

### 10. Progress Tracking
**Purpose**: Verify upload progress displays correctly

**Steps**:
1. Upload a 20MB+ file
2. Watch progress bar
3. Verify it shows 0% → intermediate percentages → 100%

**Expected Result**: ✅ Progress bar updates smoothly during upload

---

## Browser Testing

Test in multiple browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (macOS/iOS)
- ✅ Mobile browsers (iOS Safari, Android Chrome)

---

## Performance Benchmarks

Record upload times for reference:

| File Size | Expected Time (good connection) |
|-----------|--------------------------------|
| 1 MB      | < 2 seconds                    |
| 10 MB     | < 10 seconds                   |
| 50 MB     | < 60 seconds                   |
| 100 MB    | 1-2 minutes                    |

---

## Known Limitations

1. **File Size**: Maximum 5GB per file (Supabase standard upload limit)
2. **Concurrent Uploads**: Browser may limit to 6 simultaneous uploads
3. **Network Interruption**: Failed uploads must be retried manually
4. **Temp File Cleanup**: Manual or automated cleanup required for abandoned uploads

---

## Troubleshooting

### Upload Fails with CORS Error
- Check Supabase Storage CORS configuration
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Add your domain to allowed origins

### Upload Fails with 401 Unauthorized
- Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly
- Verify RLS policies allow uploads (see `supabase-storage-policies.sql`)

### Files Not Appearing in Email
- Check `SUPABASE_SERVICE_ROLE_KEY` is set (server-side)
- Verify files exist in storage at expected path
- Check server logs for download errors

### Progress Bar Doesn't Update
- This is a known limitation of `uploadToSignedUrl` in Supabase SDK
- Progress tracking would require custom implementation with xhr or fetch

---

## Automated Testing (Future Enhancement)

Consider adding:
- Playwright/Cypress tests for upload flow
- Unit tests for upload helper functions
- Integration tests for server actions
- Load testing for concurrent uploads

---

## Success Criteria

✅ All manual tests pass
✅ Files > 4.5MB upload successfully
✅ Email attachments include all uploaded files
✅ No errors in browser console
✅ Supabase storage shows files in correct locations
✅ Database records created correctly
