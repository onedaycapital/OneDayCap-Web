-- Add funder_name to funder_guidelines for easy reading in table view.
-- Kept in sync with funders.name via triggers.

alter table public.funder_guidelines
  add column if not exists funder_name text;

-- Backfill existing rows
update public.funder_guidelines g
set funder_name = f.name
from public.funders f
where f.id = g.funder_id and (g.funder_name is null or g.funder_name = '');

-- Triggers to keep funder_name in sync
create or replace function public.sync_funder_guidelines_funder_name()
returns trigger as $$
begin
  select name into new.funder_name from public.funders where id = new.funder_id;
  return new;
end;
$$ language plpgsql;

create or replace function public.sync_funder_name_to_guidelines()
returns trigger as $$
begin
  if old.name is distinct from new.name then
    update public.funder_guidelines set funder_name = new.name where funder_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists sync_funder_guidelines_funder_name on public.funder_guidelines;
create trigger sync_funder_guidelines_funder_name
  before insert or update on public.funder_guidelines
  for each row execute function public.sync_funder_guidelines_funder_name();

drop trigger if exists sync_funder_name_to_guidelines on public.funders;
create trigger sync_funder_name_to_guidelines
  after update of name on public.funders
  for each row execute function public.sync_funder_name_to_guidelines();

comment on column public.funder_guidelines.funder_name is 'Denormalized from funders.name for display; kept in sync by triggers.';
