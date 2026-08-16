# Content Creation OS — incremental rollout

## Safety rule

The current Content Director and carousel generator remain operational until a
new slice can read, write and restore the same draft reliably. New code is
additive first; replacement happens only behind an explicit adapter and after a
local migration test.

## Source boundaries

- `CONTENT_CREATION_ARCHITECTURE.md`: generic product definition.
- `BECKY_BETA_SEED.md`: first tenant data and brand rules.
- `supabase/migrations/202608100001_content_creation_os.sql`: generic database schema.
- `supabase/seeds/becky_beta.sql`: one-time Becky workspace seed.
- `src/content-os/domain`: framework-independent entities and state rules.
- `src/content-os/data`: repository contracts/implementations.

## Slice 0 — foundation

Status: complete in code, not applied to production.

- Generic account/workspace schema.
- Personas, pillars, campaigns, macro ideas, angles and content pieces.
- Published records and tenant-safe relations.
- Local versioned repository for development.
- No changes to current UI, routes, localStorage keys or IndexedDB records.

## Slice 1 — Brand setup

Build a compact Brand screen for profile, voice, positioning and guardrails.
Add Persona and Content Pillar CRUD with AI suggestions marked as proposals
until the user approves them.

Acceptance criteria:

- Becky data loads from the active workspace, not from component constants.
- Edits survive refresh.
- Another empty workspace can be created without code changes.

## Slice 2 — Ideas

Build the two short entry paths:

1. Give me ideas.
2. I already have an idea.

Persist Macro Ideas, highlights and editable metadata. Keep advanced metadata
behind Adjust/Details.

## Slice 3 — Angles and format recommendation

Generate multiple editable Angles for one Macro Idea. Let the user request more
angles with criteria. Recommend a format with a concise explanation of what the
user supplies, what AI creates, and expected cost/time/quality.

## Slice 4 — connect the existing carousel

Treat the existing five-slide generator as the first `content_piece` renderer.
Add an adapter that maps the current carousel state to:

```text
ContentPiece(format=carousel)
└── generatedContent
    ├── slides
    ├── visual direction
    ├── CTA variant
    └── generated asset references
```

Migration sequence:

1. Read the current local draft without changing it.
2. Write a copy to the new repository.
3. Reopen and compare slide text, layout, CTA and generated assets.
4. Switch reads only after parity is confirmed.
5. Keep the legacy record as a rollback source for the beta period.

## Slice 5 — Content Library and Published

Add Draft, Ready, Published and Archived views. Marking Published is manual and
reversible. Generated or downloaded content is not automatically Published.

## Slice 6 — Campaigns and basic Insights

Add optional campaign grouping and balance recommendations based only on manual
Published history. Do not imply social performance without platform analytics.

## Deferred

Social publishing, scheduling, analytics integrations, collaboration, approval
workflows, billing and multi-brand UI remain outside beta.
