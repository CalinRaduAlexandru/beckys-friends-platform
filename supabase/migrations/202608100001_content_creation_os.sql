-- Generic Content Creation OS foundation.
-- This migration is additive: it does not touch the existing admin documents,
-- surveys, or the current carousel prototype storage.

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid null references auth.users(id) on delete set null,
  name text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_workspaces (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  brand_profile jsonb not null default '{}'::jsonb,
  brand_voice jsonb not null default '{}'::jsonb,
  positioning jsonb not null default '{}'::jsonb,
  brand_knowledge jsonb not null default '{}'::jsonb,
  content_guardrails jsonb not null default '{}'::jsonb,
  onboarding_completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, slug),
  unique (id, account_id),
  constraint brand_workspace_profile_object check (jsonb_typeof(brand_profile) = 'object'),
  constraint brand_workspace_voice_object check (jsonb_typeof(brand_voice) = 'object'),
  constraint brand_workspace_positioning_object check (jsonb_typeof(positioning) = 'object'),
  constraint brand_workspace_knowledge_object check (jsonb_typeof(brand_knowledge) = 'object'),
  constraint brand_workspace_guardrails_object check (jsonb_typeof(content_guardrails) = 'object')
);

create table if not exists public.brand_workspace_members (
  brand_workspace_id uuid not null,
  account_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (brand_workspace_id, user_id),
  foreign key (brand_workspace_id, account_id)
    references public.brand_workspaces(id, account_id) on delete cascade
);

create table if not exists public.personas (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  brand_workspace_id uuid not null,
  name text not null,
  short_description text not null default '',
  profile jsonb not null default '{}'::jsonb,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, brand_workspace_id, account_id),
  foreign key (brand_workspace_id, account_id)
    references public.brand_workspaces(id, account_id) on delete cascade,
  constraint persona_profile_object check (jsonb_typeof(profile) = 'object')
);

create table if not exists public.content_pillars (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  brand_workspace_id uuid not null,
  name text not null,
  description text not null default '',
  guidance jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, brand_workspace_id, account_id),
  foreign key (brand_workspace_id, account_id)
    references public.brand_workspaces(id, account_id) on delete cascade,
  constraint content_pillar_guidance_object check (jsonb_typeof(guidance) = 'object')
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  brand_workspace_id uuid not null,
  name text not null,
  description text not null default '',
  objective text not null default '',
  status text not null default 'planning' check (status in ('planning', 'active', 'completed', 'archived')),
  starts_on date null,
  ends_on date null,
  persona_ids uuid[] not null default '{}',
  pillar_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, brand_workspace_id, account_id),
  foreign key (brand_workspace_id, account_id)
    references public.brand_workspaces(id, account_id) on delete cascade,
  constraint campaign_date_order check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table if not exists public.macro_ideas (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  brand_workspace_id uuid not null,
  campaign_id uuid null,
  title text not null,
  core_thought text not null default '',
  why_it_could_work text not null default '',
  suggested_persona_id uuid null,
  suggested_goal text null,
  suggested_pillar_id uuid null,
  suggested_category text null,
  suggested_formats text[] not null default '{}',
  highlighted boolean not null default false,
  status text not null default 'active' check (status in ('active', 'archived')),
  ai_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, brand_workspace_id, account_id),
  foreign key (brand_workspace_id, account_id)
    references public.brand_workspaces(id, account_id) on delete cascade,
  foreign key (campaign_id, brand_workspace_id, account_id)
    references public.campaigns(id, brand_workspace_id, account_id) on delete set null (campaign_id),
  foreign key (suggested_persona_id, brand_workspace_id, account_id)
    references public.personas(id, brand_workspace_id, account_id) on delete set null (suggested_persona_id),
  foreign key (suggested_pillar_id, brand_workspace_id, account_id)
    references public.content_pillars(id, brand_workspace_id, account_id) on delete set null (suggested_pillar_id),
  constraint macro_idea_ai_metadata_object check (jsonb_typeof(ai_metadata) = 'object')
);

create table if not exists public.angles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  brand_workspace_id uuid not null,
  macro_idea_id uuid not null,
  name text not null,
  premise text not null default '',
  hook_direction text not null default '',
  emotional_direction text not null default '',
  suggested_persona_id uuid null,
  suggested_goal text null,
  suggested_formats text[] not null default '{}',
  ai_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, brand_workspace_id, account_id),
  foreign key (brand_workspace_id, account_id)
    references public.brand_workspaces(id, account_id) on delete cascade,
  foreign key (macro_idea_id, brand_workspace_id, account_id)
    references public.macro_ideas(id, brand_workspace_id, account_id) on delete cascade,
  foreign key (suggested_persona_id, brand_workspace_id, account_id)
    references public.personas(id, brand_workspace_id, account_id) on delete set null (suggested_persona_id),
  constraint angle_ai_metadata_object check (jsonb_typeof(ai_metadata) = 'object')
);

create table if not exists public.content_pieces (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  brand_workspace_id uuid not null,
  campaign_id uuid null,
  macro_idea_id uuid null,
  angle_id uuid null,
  persona_id uuid null,
  primary_pillar_id uuid null,
  secondary_pillar_ids uuid[] not null default '{}',
  format text not null check (format in ('carousel', 'reel', 'single_image', 'story', 'story_sequence', 'text_post', 'long_video', 'live', 'poll', 'interactive_story')),
  goal text null,
  category text null,
  hook text not null default '',
  core_message text not null default '',
  cta text not null default '',
  caption text not null default '',
  creative_direction text not null default '',
  generated_content jsonb not null default '{}'::jsonb,
  ai_metadata jsonb not null default '{}'::jsonb,
  user_edited_fields text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'ready', 'published', 'archived')),
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, brand_workspace_id, account_id),
  foreign key (brand_workspace_id, account_id)
    references public.brand_workspaces(id, account_id) on delete cascade,
  foreign key (campaign_id, brand_workspace_id, account_id)
    references public.campaigns(id, brand_workspace_id, account_id) on delete set null (campaign_id),
  foreign key (macro_idea_id, brand_workspace_id, account_id)
    references public.macro_ideas(id, brand_workspace_id, account_id) on delete set null (macro_idea_id),
  foreign key (angle_id, brand_workspace_id, account_id)
    references public.angles(id, brand_workspace_id, account_id) on delete set null (angle_id),
  foreign key (persona_id, brand_workspace_id, account_id)
    references public.personas(id, brand_workspace_id, account_id) on delete set null (persona_id),
  foreign key (primary_pillar_id, brand_workspace_id, account_id)
    references public.content_pillars(id, brand_workspace_id, account_id) on delete set null (primary_pillar_id),
  constraint content_piece_generated_content_object check (jsonb_typeof(generated_content) = 'object'),
  constraint content_piece_ai_metadata_object check (jsonb_typeof(ai_metadata) = 'object'),
  constraint content_piece_published_state check (
    (status = 'published' and published_at is not null)
    or (status <> 'published' and published_at is null)
  )
);

create table if not exists public.published_records (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  brand_workspace_id uuid not null,
  content_piece_id uuid not null,
  platform text null,
  published_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (brand_workspace_id, account_id)
    references public.brand_workspaces(id, account_id) on delete cascade,
  foreign key (content_piece_id, brand_workspace_id, account_id)
    references public.content_pieces(id, brand_workspace_id, account_id) on delete cascade,
  constraint published_record_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists accounts_owner_user_id_idx
  on public.accounts(owner_user_id) where owner_user_id is not null;
create index if not exists personas_workspace_idx on public.personas(brand_workspace_id, is_active);
create index if not exists content_pillars_workspace_idx on public.content_pillars(brand_workspace_id, is_active, sort_order);
create index if not exists campaigns_workspace_status_idx on public.campaigns(brand_workspace_id, status);
create index if not exists macro_ideas_workspace_status_idx on public.macro_ideas(brand_workspace_id, status, highlighted);
create index if not exists macro_ideas_campaign_idx on public.macro_ideas(campaign_id);
create index if not exists angles_macro_idea_idx on public.angles(macro_idea_id);
create index if not exists content_pieces_workspace_status_idx on public.content_pieces(brand_workspace_id, status, updated_at desc);
create index if not exists content_pieces_angle_idx on public.content_pieces(angle_id);
create index if not exists published_records_workspace_date_idx on public.published_records(brand_workspace_id, published_at desc);

alter table public.accounts enable row level security;
alter table public.brand_workspaces enable row level security;
alter table public.brand_workspace_members enable row level security;
alter table public.personas enable row level security;
alter table public.content_pillars enable row level security;
alter table public.campaigns enable row level security;
alter table public.macro_ideas enable row level security;
alter table public.angles enable row level security;
alter table public.content_pieces enable row level security;
alter table public.published_records enable row level security;

revoke all on public.accounts from anon, authenticated;
revoke all on public.brand_workspaces from anon, authenticated;
revoke all on public.brand_workspace_members from anon, authenticated;
revoke all on public.personas from anon, authenticated;
revoke all on public.content_pillars from anon, authenticated;
revoke all on public.campaigns from anon, authenticated;
revoke all on public.macro_ideas from anon, authenticated;
revoke all on public.angles from anon, authenticated;
revoke all on public.content_pieces from anon, authenticated;
revoke all on public.published_records from anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'accounts', 'brand_workspaces', 'personas', 'content_pillars',
    'campaigns', 'macro_ideas', 'angles', 'content_pieces'
  ] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      table_name || '_set_updated_at',
      table_name
    );
  end loop;
end;
$$;
