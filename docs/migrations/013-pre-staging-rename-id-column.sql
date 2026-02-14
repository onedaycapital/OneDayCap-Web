-- Migration 013: Ensure Pre_Staging has lowercase "id" column (fixes "column Pre_Staging.id does not exist")
-- Some schemas use "Id" (capital I). The app expects "id" by default. Run after 012.
-- Alternative: set env SUPABASE_PRE_STAGING_ID_COLUMN to your table's PK column name (e.g. "Primary Key" for uuid PK) and skip this migration.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'Pre_Staging' and column_name = 'Id'
  ) then
    alter table public."Pre_Staging" rename column "Id" to "id";
  end if;
end
$$;
