-- Migration 007: Add SSN column to staging, pre_staging, staging_quarantine for normalized storage
-- Run after 006. Idempotent (IF NOT EXISTS / add column if not exists).

alter table if exists public.staging
  add column if not exists "SSN" text;

alter table if exists public.pre_staging
  add column if not exists "SSN" text;

alter table if exists public.staging_quarantine
  add column if not exists "SSN" text;

comment on column public.staging."SSN" is 'Normalized XXX-XX-XXXX format';
comment on column public.pre_staging."SSN" is 'Normalized XXX-XX-XXXX format';
comment on column public.staging_quarantine."SSN" is 'Normalized XXX-XX-XXXX format';
