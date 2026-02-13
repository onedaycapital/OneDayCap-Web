-- Token for "submit documents" reminder link: one-time link to land on step 5 with applicationId.
alter table public.merchant_applications
  add column if not exists documents_resume_token text;

create unique index if not exists idx_merchant_applications_documents_resume_token
  on public.merchant_applications (documents_resume_token)
  where documents_resume_token is not null;

comment on column public.merchant_applications.documents_resume_token is 'Token for 5-min reminder link: /apply/documents?t=TOKEN to resume at step 5';
