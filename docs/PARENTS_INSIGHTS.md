# Parent activity insights

Dashboard: `/admin/parents-feedback.html`. Both report APIs require the existing admin session. Local development stores isolated telemetry under `.wrangler/parents-local/`.

## Collection and meaning

- `public/parents-analytics.js` sends anonymous events in batches of 10. A persistent bounded queue retries the same UUID; the database primary key ignores duplicate delivery. Queue capacity: 1,000 events, up to 89 days locally. Clearing browser storage or exceeding the queue can lose unsent telemetry.
- A session is one page load, not a person or saved profile. A visit is one opening of an activity's instructions. Events contain no profile names, personal answers, audio, raw error messages, or screen recordings.
- `info_view`, `activity_start`, `activity_complete`, and `activity_exit` describe actual interface actions. Completion rates require a start in the selected window. Resumed visits are included and counted separately. Leaving/hidden pages are distinguished from explicit navigation away; neither is proof of dissatisfaction.
- `choice_view` stores all options, their order and a set ID. Selection or skip references that ID. One decision per set; no decision means unresolved, not rejected. Selection rate is selected/rendered sets. Reopening a set counts as a new exposure. Off-window or missing exposures exclude the associated decisions from rates and produce a report warning.
- Visible time excludes hidden-page time and instructions. Median time includes completed visits only and stops at completion. It does not measure attention, conversation time or enjoyment.
- Help button use, quiz skips and group-declared correctness are collected. JavaScript errors exclude raw messages. YouTube/internal browser errors are not fully observable.
- Localhost events are tests. The dashboard also offers a per-browser test flag; production reports exclude these events by default. Legacy star ratings predate this flag and remain explicitly labeled as potentially containing tests.
- Version `parents-188` is stored in event details for future comparisons.

## Reporting limits

Report windows: 7/30/90 days. Supabase is read in explicit pages of 500 records, with a 20,000-event guard and an explicit partial-results warning. Ratings are also paginated with a partial-results warning. High-volume reporting should move aggregation into SQL before increasing these guards.

“Low volume” means fewer than 30 exposures or 5 page sessions. This is an editorial threshold, not statistical significance. Suggested investigations require minimum counts and are hypotheses rather than causal conclusions. Unequal alternatives, position, repeat sessions, resuming progress and offline losses can bias results.

No pre-release interaction history is imported from legacy local logs: those logs do not establish reliable exposure denominators. Existing star ratings remain in `parent_question_feedback`; selections are derived from `parent_activity_events` rather than stored as ratings.

## Operations

Migration: `supabase/migrations/202609080002_parent_activity_events.sql` (additive, RLS enabled; only service role reads/writes). Applied separately to the linked project on 2026-09-08 and recorded in migration history; unrelated pending migrations were not applied.

Checks: `node scripts/test-parent-insights.mjs`, `npm run check`, and browser smoke through both question activities and dashboard filters. Production synthetic checks must always set `is_test: true`.
