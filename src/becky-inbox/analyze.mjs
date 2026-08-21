const proposalPayload = {
  type: "object",
  additionalProperties: false,
  properties: {
    age_categories: { type: "array", items: { type: "string" } },
    participant_count: { type: ["integer", "null"] },
    participants: { type: ["string", "null"] },
    result: { type: ["string", "null"] },
    observed: { type: ["string", "null"] },
    interpreted: { type: ["string", "null"] },
    hypothesized: { type: ["string", "null"] },
    action: { type: ["string", "null"] },
    capacity: { type: ["string", "null"] },
    observation: { type: ["string", "null"] },
    month_key: { type: ["string", "null"] },
    entry_date: { type: ["string", "null"] },
    type: { type: ["string", "null"] },
    text: { type: ["string", "null"] },
    role_ids: { type: "array", items: { type: "string" } },
  },
  required: [
    "age_categories",
    "participant_count",
    "participants",
    "result",
    "observed",
    "interpreted",
    "hypothesized",
    "action",
    "capacity",
    "observation",
    "month_key",
    "entry_date",
    "type",
    "text",
    "role_ids",
  ],
};
const provenanceItem = {
  type: "object",
  additionalProperties: false,
  properties: {
    field: { type: "string" },
    source: { type: "string", enum: ["note", "system", "becky", "missing"] },
    detail: { type: "string" },
  },
  required: ["field", "source", "detail"],
};
const proposal = {
  type: "object",
  additionalProperties: false,
  properties: {
    destination: {
      type: "string",
      enum: [
        "activity_observation",
        "crm_child_observation",
        "monthly_report_entry",
        "task",
        "content_lab_idea",
        "event_community_finding",
        "knowledge_candidate",
      ],
    },
    operation: { type: "string" },
    target_candidate: { type: ["string", "null"] },
    child_candidates: { type: "array", items: { type: "string" } },
    source_excerpt: { type: "string" },
    epistemic_type: {
      type: "string",
      enum: ["observed", "interpreted", "hypothesized", "action", "mixed"],
    },
    payload: proposalPayload,
    field_provenance: { type: "array", items: provenanceItem },
  },
  required: [
    "destination",
    "operation",
    "target_candidate",
    "child_candidates",
    "source_excerpt",
    "epistemic_type",
    "payload",
    "field_provenance",
  ],
};
const insight = {
  type: "object",
  additionalProperties: false,
  properties: {
    insight_title: { type: "string" },
    insight_summary: { type: "string" },
    why_it_matters: { type: "string" },
    recommended_action: { type: "string" },
    evidence_refs: { type: "array", maxItems: 8, items: { type: "string" } },
    category: {
      type: "string",
      enum: [
        "problem",
        "opportunity",
        "pattern",
        "risk",
        "learning",
        "next_test",
      ],
    },
    relevance_score: { type: "number", minimum: 0, maximum: 100 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: [
    "insight_title",
    "insight_summary",
    "why_it_matters",
    "recommended_action",
    "evidence_refs",
    "category",
    "relevance_score",
    "confidence",
  ],
};
const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    proposals: { type: "array", maxItems: 30, items: proposal },
    insights: { type: "array", maxItems: 10, items: insight },
  },
  required: ["proposals", "insights"],
};
export async function analyzeDailyNoteWithOpenAI({
  apiKey,
  model = "gpt-4.1-mini",
  noteDate,
  noteText,
  children,
  activities,
  roles,
}) {
  if (!apiKey)
    throw Object.assign(new Error("OPENAI_API_KEY lipsește"), { status: 503 });
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: `Analizezi o Notă zilnică Becky în două straturi, fără să scrii nimic canonic. STRAT 1 — insights: selectează foarte dur maximum 1–5 idei care merită atenția utilizatorului; ideal 1–3. Un insight sintetizează mai multe dovezi, explică de ce contează și recomandă o acțiune concretă, testabilă, cu context și rezultat urmărit. Nu promova reformulări, observații izolate fără consecință, routing administrativ sau duplicate semantice. evidence_refs conține exclusiv fragmente copiate exact, cuvânt cu cuvânt, din notă. relevance_score reflectă impactul, noutatea, recurența, acționabilitatea și relevanța strategică. STRAT 2 — proposals: propui mutații atomice pentru review uman. Separă strict observed, interpreted, hypothesized și action. Nu inventa ID-uri, persoane, activități, vârste, rezultate sau roluri. target_candidate conține doar numele/titlul menționat, niciodată ID. Creează Activity Observation numai dacă este numită o activitate concretă existentă sau rezolvabilă; apariția LEGO poate alimenta un insight fără să creeze automat o activitate. CRM Child Observation conține exclusiv un fapt observat sau o afirmație directă a copilului. Monthly Report Entry evită date personale inutile. Pentru V1 propune doar activity_observation/add, crm_child_observation/add și monthly_report_entry/add; celelalte destinații nu le folosi. Valorile canonice: participants Individual|2–3 copii|4–9 copii|10+ copii; result A mers bine|Mixt|Nu a mers; ages 1–2 ani|3–4 ani|5–6 ani|7–8 ani|9+ ani; monthly type done|evidence|learned; role_ids exclusiv din lista primită. Câmpurile necunoscute rămân null, [] sau text gol și provenance missing.`,
      input: JSON.stringify({
        note_date: noteDate,
        note: noteText,
        canonical_context: {
          children: children.map((child) => ({
            name: child.first_name,
            age: child.age,
          })),
          activities: activities.map((activity) => ({
            title: activity.title,
            age_categories: activity.age_categories,
          })),
          roles,
        },
      }),
      text: {
        format: {
          type: "json_schema",
          name: "becky_brief_analysis",
          strict: true,
          schema,
        },
      },
    }),
  });
  const result = await response.json().catch(() => ({}));
  const outputText = result.output
    ?.flatMap((item) => item.content || [])
    .find((item) => item.type === "output_text")?.text;
  if (!response.ok || !outputText)
    throw Object.assign(
      new Error(
        response.status === 429
          ? "Limita OpenAI a fost atinsă."
          : "Nota nu a putut fi analizată.",
      ),
      { status: response.status === 429 ? 429 : 502 },
    );
  const parsed = JSON.parse(outputText);
  return { proposals: parsed.proposals || [], insights: parsed.insights || [] };
}
