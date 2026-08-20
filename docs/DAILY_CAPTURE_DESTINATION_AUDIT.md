# Daily Capture — destination audit

Audit realizat pe aplicația existentă la 20 august 2026. Acest document descrie recipientele actuale; nu proiectează și nu implementează Daily Capture, AI routing sau automatizări.

## Criterii

- **READY** — există un model persistent, în producție și local, entitatea este adresabilă prin ID sau cheie stabilă și există o operație clară de create/append/update pentru informația respectivă.
- **PARTIAL** — există un loc apropiat semantic, dar operația actuală suprascrie un document, amestecă tipuri epistemice, depinde numai de browser sau nu păstrează forma necesară.
- **MISSING** — nu există un recipient canonic distinct și nici o operație potrivită.

Prin „API existent” se înțelege API-ul efectiv folosit de aplicație, nu doar existența unei tabele sau a unui model neconectat la runtime.

## Inventarul destinațiilor

| Destination | Status | Existing storage | Existing API | Missing capability | Minimum change |
|---|---|---|---|---|---|
| CRM Copii — vizită | **READY** | Producție: `crm_visits` (`id`, `child_id`, `visit_date`, `note`, `created_at`). Local: `data/admin-crm.json` → `visits[]`. | `POST /api/admin/crm/visits`; citire prin `GET /api/admin/crm/children/:id`. | Nota vizitei este text liber, dar acest lucru nu împiedică înregistrarea vizitei ca entitate. | Nicio modificare pentru capturarea unei vizite. Daily Capture trebuie să trimită explicit `child_id`, data și nota aprobată. |
| CRM Copii — observație factuală | **PARTIAL** | Poate fi scrisă doar în `crm_visits.note`; nu există colecție separată de observații despre copil. | `POST /api/admin/crm/visits` poate primi o notă de maximum 500 caractere. | Observația este legată forțat de o vizită și poate amesteca fapt, interpretare și acțiune; nu are tip, moment propriu sau proveniență. | Recipient separat `crm_child_observations`, cu ID, `child_id`, `observed_at`, `observation`, opțional `visit_id`, `created_at`, `updated_at`, plus POST/GET/PATCH/DELETE. Câmpul factual nu trebuie să conțină interpretări. |
| CRM Copii — continuitate | **READY** | Producție: `crm_children.continuity` și `updated_at`. Local: câmpul `continuity` din `data/admin-crm.json`. | `PATCH /api/admin/crm/children/:id`; poate seta sau goli câmpul. | Operația este replace, ceea ce este corect pentru „de unde continuăm”, fiind o stare curentă, nu jurnal. | Nicio modificare. Ruta viitoare trebuie să ceară aprobare înainte de PATCH. |
| CRM Copii — interese relevante | **READY** | Producție: `crm_children.interests`. Local: `children[].interests`. | `PATCH /api/admin/crm/children/:id`. | Este text liber și reprezintă starea curentă; nu păstrează istoric, dar cerința actuală nu îl solicită. | Nicio modificare pentru V1. Dacă va fi necesar istoric, acesta trebuie adăugat separat, nu dedus de AI. |
| Raport Lunar — ce am făcut | **PARTIAL** | Producție: `admin_monthly_report_roles.done`. Local: `data/admin-monthly-report.json` → `roles[].sections.done`. | `PATCH /api/admin/monthly-report/roles/:roleId` cu `sections.done`. | Ruta înlocuiește întregul text; nu există append atomic, intrări individuale, dată sau idempotency key. | Adaugă o operație de append controlată pentru o secțiune (`role_id`, `section=done`, text aprobat, data, source id) sau intrări de raport materializate ulterior în secțiune. |
| Raport Lunar — dovezi / rezultate | **PARTIAL** | `admin_monthly_report_roles.evidence`; local `sections.evidence`. | Același PATCH pe rol. | Suprascriere de text și lipsa unei entități adresabile pentru fiecare dovadă; nu poate diferenția număr, feedback, test sau livrabil. | Append cu ID și proveniență către `evidence`; tipul dovezii poate fi un câmp opțional, fără evaluare automată. |
| Raport Lunar — ce am învățat | **PARTIAL** | `admin_monthly_report_roles.learned`; local `sections.learned`. | Același PATCH pe rol. | Suprascriere; nu separă observația-sursă de concluzia umană și nu păstrează intrările individuale. | Append aprobat către `learned`, cu referință opțională la sursa factuală. Textul rămâne explicit o învățare/interpretare, nu fapt. |
| Raport Lunar — legare la unul sau mai multe roluri | **PARTIAL** | Rolurile există ca 8 rânduri în `admin_monthly_report_roles`. Notele zilnice folosesc doar convenția textuală `@rol`. | PATCH separat pentru fiecare rol; nu există API de relație multi-rol. | `@rol` nu este parsat, validat sau stocat ca relație; aceeași informație poate fi copiată inconsistent în mai multe roluri. | Adaugă `role_ids[]` structurat pe intrarea sursă/aprobată și o operație care validează cele 8 ID-uri înainte de distribuire. Nu duplica textul fără o sursă comună adresabilă. |
| Biblioteca Copii — testare / Activity Observation | **READY** | Producție: `admin_activity_observations`, fiecare testare cu ID propriu și `activity_id`. Local: `data/admin-activity-observations.json`. | `POST /api/admin/activity-observations`; GET filtrat prin `activity_id`; PATCH și DELETE prin ID. | Nu există încă workflow de propunere AI, dar recipientul canonic este pregătit pentru o operație externă aprobată. | Nicio schimbare de model pentru captură manuală. În viitor, propunerea trebuie validată înainte de POST. |
| Biblioteca Copii — observație | **READY** | `admin_activity_observations.observed`, obligatoriu și separat. | POST/PATCH Activity Observations. | Nimic pentru destinația canonică; UI și API o tratează deja drept nucleu factual. | Nicio modificare. Păstrează eticheta semantică `observed`. |
| Biblioteca Copii — interpretare | **READY** | `admin_activity_observations.interpreted`, opțional și separat. | POST/PATCH Activity Observations. | Nimic structural. | Nicio modificare. AI poate doar propune valoarea; utilizatorul trebuie să o aprobe. |
| Biblioteca Copii — ipoteză | **READY** | `admin_activity_observations.hypothesized`, opțional și separat. | POST/PATCH Activity Observations. | Nimic structural. | Nicio modificare. Nu promova ipoteza în `observed`. |
| Biblioteca Copii — next test / acțiune | **READY** | `admin_activity_observations.action`, opțional și separat. | POST/PATCH Activity Observations. | Nu este conectată automat la Task Center, ceea ce este corect pentru această etapă. | Nicio modificare. O eventuală transformare în task trebuie să fie o acțiune separată, aprobată. |
| Content Lab — idee de postare | **PARTIAL** | UI-ul activ folosește `localStorage` (`becky-content-director-prototype-v1`) și IndexedDB (`becky-content-director-generated-v1`). Există schema Supabase `macro_ideas`/`content_pieces`, dar nu este conectată la UI/API. | API-urile `/api/content/carousel/plan`, `/image`, `/edit` generează conținut; nu persistă idei. Repository-ul local din `src/content-os` nu este API backend. | Lipsesc persistența cross-device, CRUD backend și o operație simplă de create idea. | Conectează `macro_ideas` la un API admin minimal POST/GET/PATCH și la echivalent local JSON; păstrează metadatele AI ca propuneri, nu conținut canonic. |
| Content Lab — growth story | **PARTIAL** | Poate fi reprezentată local ca idee/draft; schema are `suggested_category`, dar UI-ul activ nu persistă în backend și nu are tip dedicat. | Nu există operație backend de create. | Taxonomie stabilă și recipient persistent; „growth story” nu trebuie inferată din text. | Același API pentru `macro_ideas`, cu `idea_type=growth_story` sau categorie validată echivalentă. |
| Content Lab — backstage story | **PARTIAL** | Schema Content OS poate exprima `behind_the_scenes`; runtime-ul folosește doar stocare în browser. | Nu există CRUD backend pentru idei. | Conectarea runtime-ului și păstrarea explicită a categoriei. | API `macro_ideas` + categorie `behind_the_scenes`, selectată/confirmată de utilizator. |
| Content Lab — authority / knowledge idea | **PARTIAL** | Schema definește `authority_expertise` și goal `authority`, dar nu este sursa folosită de Content Director. | Nu există CRUD backend pentru idei. | Persistență canonică și operație create. | API `macro_ideas` cu categorie/goal validate; AI poate propune, utilizatorul confirmă. |
| Content Lab — insight reutilizabil | **PARTIAL** | `macro_ideas.core_thought` și `brand_workspaces.brand_knowledge` există în schema neconectată; local, ideile sunt înglobate în state/draft. | Niciun API utilizat de aplicație pentru append/search insight. | Identitate proprie sau un tip clar de macro-idee, căutare și persistență backend. | În V1, folosește `macro_ideas` cu `idea_type=reusable_insight`; nu scrie direct în `brand_knowledge` fără review editorial. |
| Task Center — acțiune concretă | **READY** | Producție: `admin_tasks`. Local: `data/admin-tasks.json`. | `POST /api/admin/tasks`, PATCH/DELETE prin ID; PUT pentru ordinea completă. | Nimic esențial pentru o acțiune simplă. | Nicio modificare. Daily Capture trebuie să furnizeze `area`, `title`, `detail`, `owner`, `priority`, `sort_order` după aprobare. |
| Task Center — lipsă de materiale | **READY** | Același `admin_tasks`; poate folosi `area=operational`, titlu și detaliu explicit. | POST/PATCH tasks. | Nu există subtype dedicat, dar informația este reprezentabilă și adresabilă fără pierdere în V1. | Nicio modificare obligatorie. Un `kind` poate fi adăugat doar dacă filtrarea ulterioară o cere. |
| Task Center — problemă de rezolvat | **READY** | `admin_tasks`, cu zonă și prioritate. | POST/PATCH tasks. | Nu există relație către entitatea-sursă. | Nicio modificare pentru creare; ulterior poate primi `source_ref` opțional, fără a bloca V1. |
| Task Center — follow-up | **READY** | `admin_tasks`, ca acțiune explicită. | POST/PATCH tasks. | Nu există due date sau legătură CRM, intenționat absente în modelul actual. | Nicio modificare pentru un follow-up simplu. Legăturile se adaugă doar când workflow-ul le cere. |
| Evenimente & Comunitate — observație despre un concept | **PARTIAL** | Există documentul `workspaces` cu workspace `events` și item `event-memory`; producție în `app_documents.payload`, local în `data/workspaces.json`. | `GET/PUT /api/workspaces` salvează întregul document. | Nu există entitate cu ID, tip epistemic, concept referit sau operație append; editarea cere rescrierea documentului complet. | Recipient `community_findings`/`event_learnings` cu ID, `kind=observation`, concept/event ref, text factual și CRUD minimal. |
| Evenimente & Comunitate — feedback | **PARTIAL** | Feedbackul extern există în `event_survey_responses` și `playground_survey_responses`; observațiile interne pot ajunge doar în documentul `event-memory`. | Survey POST și rezultate read-only pentru dashboard; nu există create admin pentru feedback contextual. | Sursă, context, eveniment/concept și distincția dintre răspuns brut și sinteză internă. | Un recipient de findings cu `kind=feedback`, `source_ref` opțional și text aprobat; nu duplica răspunsul survey, ci referă ID-ul lui. |
| Evenimente & Comunitate — idee de componentă | **PARTIAL** | Poate fi scrisă manual în `event-planning`/`event-memory` din documentul `workspaces`. | Doar PUT pentru întregul document. | Identitate, status, concept/pilot țintă și create/append. | Același recipient de findings, `kind=component_idea`, cu POST și ID propriu. |
| Evenimente & Comunitate — ipoteză de comunitate | **PARTIAL** | Doar text liber în documentele workspace-ului; survey-urile oferă date-sursă, nu ipoteze canonice. | Nu există API granular. | Câmp explicit `hypothesis`, statut de netestat/testat și referință la observațiile care au generat-o. | Recipient de findings cu `kind=hypothesis`; nu salva ipoteza ca observație sau feedback. |
| Evenimente & Comunitate — rezultat al unui pilot | **PARTIAL** | Poate fi documentat în `event-memory`; datele de survey pot fi dovezi externe. | PUT document complet și GET rezultate survey. | Pilot ID, rezultat separat de interpretare, dovezi referențiate și append granular. | Recipient de findings cu `kind=pilot_result`, `pilot_ref`, rezultat factual și referințe; interpretarea rămâne câmp separat. |
| Knowledge — candidat pentru Manualul Operațional | **PARTIAL** | Manualul este documentul `manual` în `app_documents` (producție) / `data/manual.json` (local), format din blocuri cu ID. | `GET/PUT /api/manual` rescrie documentul complet. | Nu există inbox de candidați, stare `proposed/approved/rejected`, destinație de capitol sau append granular. | Adaugă o colecție de knowledge candidates cu ID, `target=operational_manual`, text, source ref și status; doar aprobarea creează/modifică blocul manualului. |
| Knowledge — candidat pentru Puieți de Oameni | **MISSING** | Nu există document, model sau colecție identificată pentru această destinație. | Niciun API. | Recipient canonic, structură, adresare și workflow de aprobare. | Definește mai întâi documentul/colecția țintă; apoi folosește același model de knowledge candidate cu `target=puieti_de_oameni`. |
| Knowledge — candidat pentru Ghidul de Comunitate | **MISSING** | Nu există recipient distinct; conținut apropiat se află amestecat în Manual și workspace-ul Events. | Niciun API granular pentru candidat. | Identitate proprie a ghidului și workflow de candidate/review. | Definește destinația canonică și adaugă `target=community_guide` în colecția de candidați. |
| Knowledge — candidat pentru Planul Strategic | **PARTIAL** | Manualul conține un bloc `strategy-update`, iar schema Content OS are `brand_workspaces.positioning/brand_knowledge`, dar nu există un Plan Strategic adresabil folosit de aplicație. | PUT pentru întregul Manual; fără API de candidat sau plan. | Document țintă clar, versiuni, candidat și aprobare. | Stabilește Planul Strategic ca document canonic, apoi adaugă `target=strategic_plan` în colecția de candidați; nu scrie direct în strategie din output AI. |

## Notele zilnice ca sursă pentru viitorul Daily Capture

Actualul jurnal poate și merită să rămână **sursa brută de captură**, deci nu este necesar un al doilea jurnal paralel.

În prezent:

- producția folosește `admin_monthly_report_notes`, cu `note_date` drept cheie primară, `note` și `updated_at`;
- local, notele sunt în `data/admin-monthly-report.json` → `notes[YYYY-MM-DD]`;
- `PATCH /api/admin/monthly-report/notes` salvează sau golește nota unei zile;
- marcajele `@rol` sunt doar text, nu relații programatice;
- există o singură bucată de text pe zi, editabilă și suprascrisă ca întreg.

Concluzie: jurnalul este potrivit ca **intake layer**, nu ca depozit canonic pentru CRM, raport, activități, taskuri sau knowledge. Extinderea lui ar trebui să păstreze nota originală și să adauge, când va fi cazul, o identitate/versionare stabilă și propuneri de rutare separate. Nu trebuie copiat jurnalul într-un al doilea sistem de note.

Fluxul viitor trebuie să fie:

`notă zilnică brută → extragere propusă → destinație și tip epistemic propuse → verificare/editare umană → confirmare → write canonic`

O propunere trebuie să păstreze explicit:

- `observed` — fapt relatat/observabil;
- `interpreted` — sens atribuit de om sau sugerat de AI;
- `hypothesized` — explicație încă netestată;
- `action` — lucru decis pentru viitor.

Aceste câmpuri nu trebuie concatenate și nu trebuie promovate automat dintr-un nivel în altul. Mai ales pentru copii și părinți, nicio interpretare sau ipoteză generată nu poate deveni fapt canonic fără confirmarea explicită a utilizatorului.

## Următorul recipient recomandat

Construiește doar **CRM Child Observations V1**: observații factuale despre copil, cu identitate proprie și legătură opțională la o vizită.

Este cel mai important gol deoarece `crm_visits.note` este acum singurul loc disponibil și încurajează amestecarea faptelor cu interpretări. Recipientul minim ar conține `id`, `child_id`, `visit_id` opțional, `observed_at`, `observation`, `created_at`, `updated_at` și CRUD simplu. Interpretarea, ipoteza și recomandarea nu trebuie incluse în același câmp și nu trebuie adăugate în acest V1.
