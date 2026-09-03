-- Add the independent "Parent Pearl" branch to Content Lab.
alter table public.admin_content_lab_ideas
  drop constraint if exists admin_content_lab_ideas_idea_type_check;

alter table public.admin_content_lab_ideas
  add constraint admin_content_lab_ideas_idea_type_check
  check (idea_type in ('growth_story', 'behind_the_scenes', 'authority_expertise', 'reusable_insight', 'parent_pearl'));
