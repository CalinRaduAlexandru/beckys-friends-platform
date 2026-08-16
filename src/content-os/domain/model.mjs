export const CONTENT_FORMATS = Object.freeze([
  'carousel',
  'reel',
  'single_image',
  'story',
  'story_sequence',
  'text_post',
  'long_video',
  'live',
  'poll',
  'interactive_story'
]);

export const CONTENT_STATUSES = Object.freeze(['draft', 'ready', 'published', 'archived']);
export const CAMPAIGN_STATUSES = Object.freeze(['planning', 'active', 'completed', 'archived']);
export const CONTENT_GOALS = Object.freeze([
  'awareness',
  'engagement',
  'education',
  'trust',
  'authority',
  'community',
  'conversion',
  'retention',
  'reactivation'
]);

export const CONTENT_CATEGORIES = Object.freeze([
  'educational',
  'entertainment',
  'inspirational',
  'storytelling',
  'behind_the_scenes',
  'community',
  'social_proof',
  'product_service',
  'promotional',
  'authority_expertise',
  'opinion_pov',
  'interactive',
  'trend_reactive',
  'brand_culture',
  'faq_objection_handling',
  'announcement_news'
]);

const now = () => new Date().toISOString();
const id = () => globalThis.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const text = value => typeof value === 'string' ? value.trim() : '';
const values = value => Array.isArray(value) ? [...new Set(value.filter(Boolean))] : [];
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? structuredClone(value) : {};

function tenant(input) {
  const accountId = text(input.accountId || input.account_id);
  const brandWorkspaceId = text(input.brandWorkspaceId || input.brand_workspace_id);
  if (!accountId || !brandWorkspaceId) throw new Error('accountId și brandWorkspaceId sunt obligatorii.');
  return { accountId, brandWorkspaceId };
}

function base(input) {
  const scope = tenant(input);
  const createdAt = input.createdAt || input.created_at || now();
  return {
    id: text(input.id) || id(),
    ...scope,
    createdAt,
    updatedAt: input.updatedAt || input.updated_at || createdAt
  };
}

export function createPersona(input) {
  return {
    ...base(input),
    name: text(input.name),
    shortDescription: text(input.shortDescription || input.short_description),
    profile: object(input.profile),
    isPrimary: Boolean(input.isPrimary ?? input.is_primary),
    isActive: input.isActive ?? input.is_active ?? true
  };
}

export function createContentPillar(input) {
  return {
    ...base(input),
    name: text(input.name),
    description: text(input.description),
    guidance: object(input.guidance),
    isActive: input.isActive ?? input.is_active ?? true,
    sortOrder: Number(input.sortOrder ?? input.sort_order) || 0
  };
}

export function createCampaign(input) {
  const status = CAMPAIGN_STATUSES.includes(input.status) ? input.status : 'planning';
  return {
    ...base(input),
    name: text(input.name),
    description: text(input.description),
    objective: text(input.objective),
    status,
    startsOn: input.startsOn || input.starts_on || null,
    endsOn: input.endsOn || input.ends_on || null,
    personaIds: values(input.personaIds || input.persona_ids),
    pillarIds: values(input.pillarIds || input.pillar_ids)
  };
}

export function createMacroIdea(input) {
  return {
    ...base(input),
    campaignId: input.campaignId || input.campaign_id || null,
    title: text(input.title),
    coreThought: text(input.coreThought || input.core_thought),
    whyItCouldWork: text(input.whyItCouldWork || input.why_it_could_work),
    suggestedPersonaId: input.suggestedPersonaId || input.suggested_persona_id || null,
    suggestedGoal: input.suggestedGoal || input.suggested_goal || null,
    suggestedPillarId: input.suggestedPillarId || input.suggested_pillar_id || null,
    suggestedCategory: input.suggestedCategory || input.suggested_category || null,
    suggestedFormats: values(input.suggestedFormats || input.suggested_formats),
    highlighted: Boolean(input.highlighted),
    status: input.status === 'archived' ? 'archived' : 'active',
    aiMetadata: object(input.aiMetadata || input.ai_metadata)
  };
}

export function createAngle(input) {
  const macroIdeaId = input.macroIdeaId || input.macro_idea_id;
  if (!macroIdeaId) throw new Error('macroIdeaId este obligatoriu pentru un Angle.');
  return {
    ...base(input),
    macroIdeaId,
    name: text(input.name),
    premise: text(input.premise),
    hookDirection: text(input.hookDirection || input.hook_direction),
    emotionalDirection: text(input.emotionalDirection || input.emotional_direction),
    suggestedPersonaId: input.suggestedPersonaId || input.suggested_persona_id || null,
    suggestedGoal: input.suggestedGoal || input.suggested_goal || null,
    suggestedFormats: values(input.suggestedFormats || input.suggested_formats),
    aiMetadata: object(input.aiMetadata || input.ai_metadata)
  };
}

export function createContentPiece(input) {
  const format = CONTENT_FORMATS.includes(input.format) ? input.format : 'carousel';
  const status = CONTENT_STATUSES.includes(input.status) ? input.status : 'draft';
  const publishedAt = status === 'published' ? input.publishedAt || input.published_at || now() : null;
  return {
    ...base(input),
    campaignId: input.campaignId || input.campaign_id || null,
    macroIdeaId: input.macroIdeaId || input.macro_idea_id || null,
    angleId: input.angleId || input.angle_id || null,
    personaId: input.personaId || input.persona_id || null,
    primaryPillarId: input.primaryPillarId || input.primary_pillar_id || null,
    secondaryPillarIds: values(input.secondaryPillarIds || input.secondary_pillar_ids),
    format,
    goal: input.goal || null,
    category: input.category || null,
    hook: text(input.hook),
    coreMessage: text(input.coreMessage || input.core_message),
    cta: text(input.cta),
    caption: text(input.caption),
    creativeDirection: text(input.creativeDirection || input.creative_direction),
    generatedContent: object(input.generatedContent || input.generated_content),
    aiMetadata: object(input.aiMetadata || input.ai_metadata),
    userEditedFields: values(input.userEditedFields || input.user_edited_fields),
    status,
    publishedAt
  };
}

export function updateContentPiece(piece, patch, editedFields = Object.keys(patch)) {
  const next = createContentPiece({
    ...piece,
    ...patch,
    id: piece.id,
    accountId: piece.accountId,
    brandWorkspaceId: piece.brandWorkspaceId,
    createdAt: piece.createdAt,
    updatedAt: now(),
    userEditedFields: [...piece.userEditedFields, ...editedFields]
  });
  return next;
}

export function markContentPiecePublished(piece, { platform = null, publishedAt = now() } = {}) {
  const contentPiece = updateContentPiece(piece, { status: 'published', publishedAt }, ['status', 'publishedAt']);
  return {
    contentPiece,
    publishedRecord: {
      ...base({ accountId: contentPiece.accountId, brandWorkspaceId: contentPiece.brandWorkspaceId }),
      contentPieceId: contentPiece.id,
      platform,
      publishedAt,
      metadata: {}
    }
  };
}

export function unmarkContentPiecePublished(piece) {
  return updateContentPiece(piece, { status: 'ready', publishedAt: null }, ['status', 'publishedAt']);
}

export function assertWorkspaceEntity(entity, accountId, brandWorkspaceId) {
  if (entity.accountId !== accountId || entity.brandWorkspaceId !== brandWorkspaceId) {
    throw new Error('Entitatea nu aparține workspace-ului activ.');
  }
  return entity;
}
