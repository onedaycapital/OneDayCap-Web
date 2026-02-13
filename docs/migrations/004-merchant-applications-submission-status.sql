-- Support two-phase submit: step 4 saves application + PDF (pending_documents), step 5 submits documents.
-- Cron uses this to send "submit documents" reminder after 5 minutes.

alter table public.merchant_applications
  add column if not exists submission_status text default 'submitted';

alter table public.merchant_applications
  add column if not exists documents_reminder_sent_at timestamptz;

-- Allow 'pending_documents' for applications saved at step 4 before documents uploaded
alter table public.merchant_applications
  drop constraint if exists merchant_applications_submission_status_check;
alter table public.merchant_applications
  add constraint merchant_applications_submission_status_check
  check (submission_status in ('pending_documents', 'submitted'));

-- Backfill: existing rows are submitted
update public.merchant_applications
set submission_status = 'submitted'
where submission_status is null or submission_status = '';

alter table public.merchant_applications
  alter column submission_status set not null,
  alter column submission_status set default 'submitted';

comment on column public.merchant_applications.submission_status is 'pending_documents = saved at step 4 (Sign & Conclude), awaiting documents; submitted = documents submitted at step 5';
comment on column public.merchant_applications.documents_reminder_sent_at is 'When we sent the 5-min reminder email to user and subs@ to submit documents';
