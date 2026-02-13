-- Optional: mark funders that already have signed ISO agreements (run once after 001).
-- Adjust the list to match your signed funders.

update public.funders
set iso_agreement_signed = true
where name in (
  'Eminent Funding',
  'Pivot Funding Group',
  'Dexly Finance'
);
