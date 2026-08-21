alter table public.admin_becky_inbox_proposals
  add column if not exists resolution_status text,
  add column if not exists resolution_query text,
  add column if not exists destination_verified_at timestamptz,
  add column if not exists destination_entity_updated_at timestamptz,
  add column if not exists reverted_at timestamptz,
  add column if not exists revert_error text;

update public.admin_becky_inbox_proposals
set resolution_status = case
  when destination = 'monthly_report_entry' then 'resolved'
  when target_entity_id is not null then 'resolved'
  when jsonb_array_length(coalesce(target_candidates, '[]'::jsonb)) > 1 then 'ambiguous'
  else 'not_found'
end
where resolution_status is null;

alter table public.admin_becky_inbox_proposals
  alter column resolution_status set default 'not_found',
  alter column resolution_status set not null;

alter table public.admin_becky_inbox_proposals
  drop constraint if exists admin_becky_inbox_proposals_resolution_status_check;
alter table public.admin_becky_inbox_proposals
  add constraint admin_becky_inbox_proposals_resolution_status_check
  check (resolution_status in ('resolved','ambiguous','not_found'));

alter table public.admin_becky_inbox_proposals
  drop constraint if exists admin_becky_inbox_proposals_status_check;
alter table public.admin_becky_inbox_proposals
  add constraint admin_becky_inbox_proposals_status_check
  check (status in ('pending','approved','ignored','failed','reverted'));
