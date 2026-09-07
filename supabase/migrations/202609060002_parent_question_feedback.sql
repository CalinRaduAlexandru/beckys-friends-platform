create table if not exists public.parent_question_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  activity_id text not null,
  question_index integer not null check (question_index >= 0),
  question_text text not null,
  rating smallint not null check (rating between 1 and 5),
  group_size text not null default 'small' check (group_size in ('small', 'large')),
  created_at timestamptz not null default now()
);
create index if not exists parent_question_feedback_activity_idx on public.parent_question_feedback (activity_id, question_index, created_at desc);
create index if not exists parent_question_feedback_created_at_idx on public.parent_question_feedback (created_at desc);
alter table public.parent_question_feedback enable row level security;
revoke all on public.parent_question_feedback from anon, authenticated;
