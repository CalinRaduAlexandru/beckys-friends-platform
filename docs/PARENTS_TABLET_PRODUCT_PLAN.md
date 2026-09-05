+# Becky · experiența pentru părinți

## Scop

O aplicație care poate rămâne pe o tabletă la masa părinților și îi inspiră pentru timpul dintre adulți: conversație, râs, conectare și jocuri ușoare. Copiii pot apărea doar ca variație opțională, niciodată ca premisă a experienței.

## Regula de separare

Noua suprafață va avea ruta, shell-ul, starea locală și colecția ei de conținut:

- rută propusă: `/parinti`;
- fișiere UI proprii: `public/parents-tablet.html`, `public/parents-tablet.js`, `public/parents-tablet.css`;
- date proprii: `data/parent-experiences.json`;
- identificator de suprafață: `parents`;
- fără amestec automat cu `facilitator`, `joaca`, biblioteca copiilor sau playlisturile copiilor.

Reutilizăm shell-ul vizual, tokenurile de design, autentificarea administrativă doar unde este necesar, utilitarele API și infrastructura de deploy. Nu reutilizăm starea locală sau listele UI ale facilitatorului.

## Primul MVP

1. Ecran de așteptare: „Timp pentru voi” și o invitație discretă de a explora.
2. Filtre simple: „2 minute”, „10 minute”, „fără mișcare”, „mai energic”, „conversație”, „râs”.
3. Card de activitate cu titlu, durată, număr de persoane și instrucțiuni scurte.
4. Butoane „Începe”, „Altă idee” și „Gata”; tap-ul înapoi revine la masă.
5. Reset automat după inactivitate, ca tableta să fie pregătită pentru următorul grup.

Pentru primul test alegem 6–8 idei reprezentative, nu întreaga listă: o întrebare de conversație, un joc de ghicit, un joc de vot, o activitate creativă la masă, o improvizație și o opțiune de mișcare ușoară.

## Model editorial

Fiecare idee devine activitate numai după ce are: `id`, `title`, `category`, `duration`, `participants`, `energy`, `prompt`, `steps`, `optionalChildVariation`, `tags`, `status` și `source`.

Stările sunt: `draft` → `internal-test` → `wild-test` → `live` sau `retired`. Observațiile de test rămân într-un jurnal separat și nu se scriu peste textul activității.

## Analitics de la început

Folosim evenimente anonime, limitate la suprafața părinților: `session_start`, `activity_view`, `activity_start`, `prompt_next`, `activity_exit`, `activity_complete`, `session_end`. Măsurăm durata activă, numărul de tapuri și unde ies oamenii; nu colectăm nume, telefoane, audio sau conținutul conversațiilor.

În tabletă, evenimentele se pun într-o coadă locală și se trimit grupat când există conexiune. Fiecare eveniment are `surface: "parents"`, `experience_id`, `session_id`, `event_name`, `occurred_at`, `duration_ms`, `app_version`. Un endpoint separat, `/api/analytics/parents`, ține datele izolată de analitics-ul chestionarelor.

Indicatorii utili pentru început: porniri, procent care trec de 15/60/180 secunde, finalizări, ieșiri și activități cu cel mai mare timp activ. Nu optimizăm pentru tapuri multe; un joc bun poate avea puține tapuri și mult timp petrecut împreună.

## Fluxul de lucru

1. Alegem câteva idei din sursă și le rescriem ca experiențe clare.
2. Le testăm noi pe tabletă, la masă, fără explicații din afara ecranului.
3. Corectăm textul și ritmul.
4. Publicăm ruta discret, cu un URL/QR doar pentru testare.
5. Lăsăm 5–10 sesiuni reale să ruleze.
6. Citim datele împreună cu observațiile umane și promovăm doar ce merită.

Principiul de siguranță este „feature flag”: noua ramură rămâne ascunsă până când este validată și nu poate modifica meniurile sau datele experiențelor existente.

