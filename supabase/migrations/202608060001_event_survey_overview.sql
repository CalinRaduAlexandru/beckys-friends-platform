create or replace view public.event_survey_response_overview
with (security_invoker = true)
as
select
  id,
  submitted_at,
  answers -> 'childCount' ->> 0 as child_count,
  answers -> 'childAges' as child_ages,
  answers -> 'motivation' ->> 0 as top_motivation,
  answers -> 'worth' ->> 0 as top_decision_criterion,
  answers -> 'blockers' ->> 0 as top_blocker,
  answers -> 'weekdays' ->> 0 as preferred_weekday,
  answers -> 'timeWindow' ->> 0 as preferred_time_window,
  answers -> 'childFeeling' ->> 0 as desired_child_outcome,
  answers -> 'parentFeeling' ->> 0 as desired_parent_outcome,
  concept_ranking ->> 0 as top_event_concept,
  nullif(answers ->> 'mainOpen', '') as successful_event_in_own_words,
  nullif(answers ->> 'extraOpen', '') as additional_feedback,
  schema_version
from public.event_survey_responses;

comment on view public.event_survey_response_overview is
  'Human-readable overview of event survey responses; full ordered answers remain in event_survey_responses.';

revoke all on public.event_survey_response_overview from anon, authenticated;
