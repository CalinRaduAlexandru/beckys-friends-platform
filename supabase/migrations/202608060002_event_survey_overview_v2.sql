create or replace view public.event_survey_response_overview
with (security_invoker = true)
as
select
  id,
  submitted_at,
  answers -> 'childCount' ->> 0 as child_count,
  answers -> 'childAges' as child_ages,
  case when schema_version < 2 then answers -> 'motivation' ->> 0 end as top_motivation,
  answers -> 'worth' ->> 0 as top_decision_criterion,
  answers -> 'blockers' ->> 0 as top_blocker,
  case when schema_version < 2 then answers -> 'weekdays' ->> 0 end as preferred_weekday,
  case when schema_version < 2 then answers -> 'timeWindow' ->> 0 end as preferred_time_window,
  case when schema_version < 2 then answers -> 'childFeeling' ->> 0 end as desired_child_outcome,
  case when schema_version < 2 then answers -> 'parentFeeling' ->> 0 end as desired_parent_outcome,
  concept_ranking ->> 0 as top_event_concept,
  nullif(answers ->> 'mainOpen', '') as successful_event_in_own_words,
  nullif(answers ->> 'extraOpen', '') as additional_feedback,
  schema_version,
  answers -> 'motivation' as motivations,
  answers -> 'weekdays' as available_weekdays,
  answers -> 'startTime' as available_start_times,
  answers -> 'eventDuration' ->> 0 as preferred_duration,
  answers -> 'desiredOutcomes' as desired_outcomes,
  concept_ranking ->> 0 as first_event_concept,
  concept_ranking ->> 1 as second_event_concept,
  concept_ranking ->> 2 as third_event_concept
from public.event_survey_responses;

comment on view public.event_survey_response_overview is
  'Human-readable survey overview. Schema 2 treats motivations, availability and outcomes as multi-select; only the top three event concepts are intended for comparison.';

revoke all on public.event_survey_response_overview from anon, authenticated;
