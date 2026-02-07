# Setup Checklist - Large File Upload Feature

Complete these steps to activate the large file upload feature.

## ✅ Step 1: Add Environment Variable

Add the Supabase anon key to your `.env.local` file:

```bash
# Open .env.local and add this line:
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
```

**Where to find it:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the `anon` `public` key (NOT the service_role key)
5. Paste it in `.env.local`

---

## ✅ Step 2: Create Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name: `merchant-documents`
4. Public: **OFF** (keep it private)
5. Click "Create bucket"

**OR** run this SQL in Supabase SQL Editor:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'merchant-documents',
  'merchant-documents',
  false,
  5368709120,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/gif', 'text/csv']
)
ON CONFLICT (id) DO NOTHING;
```

---

## ✅ Step 3: Configure Storage Policies

Run these SQL commands in Supabase SQL Editor:

```sql
-- Allow uploads using presigned URLs
CREATE POLICY "Allow presigned uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'merchant-documents');

-- Allow anon uploads (for client-side)
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'merchant-documents');

-- Service role full access
CREATE POLICY "Allow service role full access"
ON storage.objects
TO service_role
USING (bucket_id = 'merchant-documents')
WITH CHECK (bucket_id = 'merchant-documents');

-- Service role delete
CREATE POLICY "Allow service role delete"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'merchant-documents');

-- Service role update (for moving files)
CREATE POLICY "Allow service role update"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'merchant-documents')
WITH CHECK (bucket_id = 'merchant-documents');
```

---

## ✅ Step 4: Configure CORS

1. Go to Supabase Dashboard → Storage → Configuration
2. Add CORS policy:
   - **Allowed Origins**: 
     - `http://localhost:3001` (your dev server)
     - `http://localhost:3000` (backup)
     - Your production domain when ready
   - **Allowed Methods**: `GET, POST, PUT, DELETE`
   - **Allowed Headers**: `authorization, x-client-info, apikey, content-type`
   - **Max Age**: `3600`

---

## ✅ Step 5: Restart Dev Server

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
cd /Users/surajpanicker/Projects/OneDayCap-Web
PORT=3001 npm run dev
```

---

## ✅ Step 6: Test the Feature

1. Navigate to `http://localhost:3001/processing-application` (or `/application`)
2. Fill out steps 1-4
3. On Step 5, try uploading:
   - A small file (< 1MB) - should work immediately
   - A larger file (> 5MB) - should show progress and complete
   - Multiple bank statements - should upload concurrently

**Expected behavior:**
- ✅ Progress bar appears during upload
- ✅ Green checkmark and file details appear when done
- ✅ Can remove and re-upload files
- ✅ Form submission works with uploaded files
- ✅ Email includes all attachments

---

## 🐛 Troubleshooting

### "Cannot find module cleanup-uploads" error
- **Solution**: Restart your dev server, TypeScript needs to pick up new files

### CORS error in browser console
- **Solution**: Make sure you added your domain to CORS configuration
- Check that you included `http://localhost:3001`

### 401 Unauthorized error
- **Solution**: Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly
- Check that RLS policies were applied (Step 3)

### Upload stuck at 0%
- **Solution**: Check browser console for errors
- Verify presigned URL is being generated (check Network tab)
- Ensure CORS is configured

### Files not in email
- **Solution**: Verify `SUPABASE_SERVICE_ROLE_KEY` is set (should already be set)
- Check that files exist in Supabase Storage
- Check server logs for download errors

---

## 📚 Additional Resources

- Full documentation: `docs/LARGE_FILE_UPLOAD.md`
- Testing guide: `docs/TESTING_LARGE_FILE_UPLOAD.md`
- Storage policies: `docs/supabase-storage-policies.sql`
- Implementation summary: `docs/IMPLEMENTATION_SUMMARY.md`

---

## ✅ Checklist Summary

- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
- [ ] Create `merchant-documents` bucket in Supabase
- [ ] Run RLS policy SQL commands
- [ ] Configure CORS in Supabase Dashboard
- [ ] Restart dev server
- [ ] Test file upload functionality

Once all steps are complete, you can upload files of unlimited size! 🎉
