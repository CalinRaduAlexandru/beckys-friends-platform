-- Apply once after the generic Content Creation OS migration.
-- Source of truth for tenant decisions: BECKY_BETA_SEED.md, kept next to the product architecture.

insert into public.accounts (id, name)
values ('10000000-0000-4000-8000-000000000001', 'Becky''s Garden')
on conflict (id) do nothing;

insert into public.brand_workspaces (
  id,
  account_id,
  name,
  slug,
  brand_profile,
  brand_voice,
  positioning,
  content_guardrails
)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Becky''s Garden',
  'beckys-garden',
  '{"short_description":"Spațiu de joacă și experiențe pentru copii și familii.","industry":"Experiențe pentru copii și familie","location":"România","seed_status":"requires_onboarding_review"}'::jsonb,
  '{"traits":["cald","jucăuș","clar","empatic"],"languages":["ro"],"preferred_fonts":{"carousel_headline":"DynaPuff","body":"Quicksand"},"copy_principles":["fiecare slide transmite o idee de sine stătătoare","relevanța pentru părinte este explicită","fără jargon de marketing"]}'::jsonb,
  '{"audience":"Părinți și familii","promise":"Joacă și experiențe care apropie familia și susțin curiozitatea copilului.","seed_status":"requires_onboarding_review"}'::jsonb,
  '{"visual_brand_locked":true,"forbidden_content":["afirmații medicale nefundamentate","rezultate, testimoniale, prețuri sau politici inventate","copii sau interacțiuni prezentate ca reale când sunt generate"],"regeneration_rules":["păstrează câmpurile editate manual","regenerarea ilustrației păstrează copy-ul și layoutul"]}'::jsonb
)
on conflict (id) do nothing;
