-- Migration 011: Store "Do nothing" choices for duplicate-email groups so they don't show again
-- Run in Supabase SQL Editor.

create table if not exists public.staging_duplicate_dismissed (
  email text primary key,
  dismissed_at timestamptz not null default now()
);

comment on table public.staging_duplicate_dismissed is 'Emails (from Duplicate emails report) that user chose "Do nothing" for; excluded from report.';
