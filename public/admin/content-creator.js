(() => {
  const STORAGE_KEY = 'becky-content-director-prototype-v1';
  const defaults = {
    contentView: 'home',
    contentItemId: '',
    selectedContentItemKey: '',
    contentDetailTab: 'manual',
    creationEntry: 'own',
    activeCampaignId: 'becky-organic',
    campaigns: [
      {
        id: 'becky-organic',
        name: 'Becky · Conținut organic',
        objective: 'Idei utile pentru părinți și vizite la Becky',
        description: 'Postări educaționale și de brand pentru social media.',
        status: 'active',
        createdAt: '2026-08-11T00:00:00.000Z'
      }
    ],
    savedIdeas: [],
    ideaBranch: '',
    selectedIdeaPlan: null,
    brandSettings: {
      voice: 'Caldă, jucăușă, clară și empatică',
      audience: 'Părinți care caută experiențe cu sens pentru copiii lor',
      promise: 'Facem timpul petrecut împreună mai curios, mai creativ și mai memorabil.',
      preferred: 'joacă, curiozitate, explorare, împreună, experiență',
      avoid: 'promisiuni exagerate, presiune, limbaj rece sau prea comercial',
      defaultCta: 'Vino să descoperi experiența Becky împreună cu copilul tău.'
    },
    step: 1,
    context: '',
    objective: 'connection',
    angle: 'emotional',
    angleEdits: {},
    customAngles: [],
    directionCriteria: '',
    postCaption: '',
    postCaptionAuto: true,
    postCaptionStyle: '',
    format: 'carousel',
    carouselVariant: 'story-cards',
    carouselQuality: 'medium',
    discardedSolutionHeadings: [],
    carouselSlides: [
      { title: 'Hook', change: '', assistantInstruction: '', layout: {} },
      { title: 'Ideea 1', change: '', assistantInstruction: '', layout: {} },
      { title: 'Ideea 2', change: '', assistantInstruction: '', layout: {} },
      { title: 'Ideea 3', change: '', assistantInstruction: '', layout: {} },
      { title: 'CTA', change: '', assistantInstruction: '', layout: {} }
    ],
    tasks: {},
    updatedAt: null
  };

  const objectives = {
    registrations: {
      label: 'Vreau înscrieri acum',
      description: 'Postarea trebuie să ducă la o acțiune concretă.',
      example: 'Exemplu: ai locuri deschise pentru o sesiune de sâmbătă.',
      cta: 'Scrie-ne „VREAU” în mesaj și îți trimitem detaliile.'
    },
    awareness: {
      label: 'Vreau să se recunoască în problemă',
      description: 'Începem cu o situație pe care părintele o trăiește deja.',
      example: 'Exemplu: copilul renunță repede când ceva nu îi iese.',
      cta: 'Salvează ideea pentru următoarea ieșire în familie.'
    },
    visits: {
      label: 'Vreau să înțeleagă experiența',
      description: 'Arătăm clar ce se întâmplă și ce primește familia.',
      example: 'Exemplu: explici ce face copilul în prima oră la Becky.',
      cta: 'Vino să descoperi experiența Becky împreună cu copilul tău.'
    },
    connection: {
      label: 'Vreau să simtă de ce contează',
      description: 'Legăm activitatea de timpul și conexiunea părinte–copil.',
      example: 'Exemplu: vrei să comunici valoarea unei experiențe împreună.',
      cta: 'Alegeți timp pentru voi. Scrie-ne și îți trimitem detaliile.'
    }
  };

  const angles = {
    problem: {
      letter: 'A',
      label: 'Problema pe care părintele o recunoaște',
      short: 'Problem awareness',
      reason: 'Oprește scroll-ul printr-o situație familiară și creează relevanță înainte să vorbească despre Becky.',
      hook: 'Copilul renunță repede când ceva nu îi iese din prima?'
    },
    explain: {
      letter: 'B',
      label: 'Arată ce se întâmplă concret',
      short: 'Explain the experience',
      reason: 'Reduce neclaritatea și îi ajută pe părinți să își imagineze experiența înainte să decidă.',
      hook: 'Ce se întâmplă, concret, într-o experiență Becky?'
    },
    emotional: {
      letter: 'C',
      label: 'Conexiunea părinte–copil',
      short: 'Emotional value',
      reason: 'Leagă activitatea de rezultatul emoțional pe care părintele îl caută de fapt.',
      hook: 'Uneori, 30 de minute împreună valorează mai mult decât încă o activitate.'
    }
  };

  function availableAngles() {
    return { ...angles, ...Object.fromEntries((state.customAngles || []).map(item => [item.key, item])) };
  }

  function angleFor(key) {
    const base = availableAngles()[key];
    if (!base) return null;
    return { ...base, ...(state.angleEdits?.[key] || {}) };
  }

  const formats = {
    hybrid: { label: 'Reel hibrid', detail: 'Talking head + cadre reale + motion typography', when: 'Când vrei reach și o voce umană, nu doar un post salvat.', you: 'Dai un video scurt sau o idee de filmare și aprobi textul.', ai: 'Propune structura, textul pe cadre și indicații de montaj; nu filmează în locul tău.' },
    carousel: { label: 'Carousel 1:1', detail: 'Imagini generate automat · 4–6 slide-uri + CTA', when: 'Când vrei să explici o idee în pași și să poată fi salvată sau distribuită.', you: 'Alegi direcția, aprobi textele și ceri modificări pe slide-uri.', ai: 'Generează imaginile, compoziția și varianta finală descărcabilă.' },
    story: { label: 'Story sequence', detail: '3–5 cadre scurte, construite pentru răspuns', when: 'Când vrei reacții rapide: reply, poll, întrebare sau mesaj direct.', you: 'Alegi oferta/întrebarea și verifici ordinea cadrelor înainte de publicare.', ai: 'Scrie cele 3–5 cadre și propune stickerul/interacțiunea potrivită; nu publică automat.' }
  };

  const carouselVariants = {
    'story-cards': { label: 'Story cards', detail: 'Carduri clare, cu o idee puternică pe fiecare slide.', slides: ['Hook', 'Ideea 1', 'Ideea 2', 'Ideea 3', 'CTA'] },
    'photo-editorial': { label: 'Photo editorial', detail: 'Compoziții calde, aerisite, cu text scurt peste imagine.', slides: ['Copertă', 'Context', 'Beneficiu', 'Dovadă', 'CTA'] },
    'playful-guide': { label: 'Playful guide', detail: 'Pași vizuali, ilustrații și accente jucăușe Becky.', slides: ['Întrebarea', 'Pasul 1', 'Pasul 2', 'Pasul 3', 'CTA'] }
  };

  const MIN_CAROUSEL_SLIDES = 3;
  const DEFAULT_CAROUSEL_SLIDES = 5;
  const MAX_CAROUSEL_SLIDES = 10;

  function carouselSlideCount() {
    return Math.max(MIN_CAROUSEL_SLIDES, Math.min(MAX_CAROUSEL_SLIDES, state.carouselSlides?.length || DEFAULT_CAROUSEL_SLIDES));
  }

  function carouselSlideTitles(count = carouselSlideCount()) {
    return Array.from({ length: count }, (_, index) => {
      if (index === 0) return 'Problemă + promisiune';
      if (index === count - 1) return 'Becky · CTA';
      return `${solutionNumberEmoji(index)} Soluția ${String.fromCharCode(64 + index)}`;
    });
  }

  function solutionNumberEmoji(number) {
    const emojis = ['', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return emojis[number] || `${number}.`;
  }

  function coverPromise(solutionCount = carouselSlideCount() - 2) {
    const source = normalizedCopy(`${state.carouselSlides?.[0]?.heading || ''} ${state.context || ''}`);
    const prefix = `${solutionCount} modalități să-ți ajuți copilul să`;
    if (source.includes('ajutor') && (source.includes('incer') || source.includes('frustr'))) return `${solutionCount} răspunsuri care îl ajută să facă singur primul pas.`;
    if (source.includes('corect') || source.includes('verdict')) return `${solutionCount} moduri prin care corectezi fără să-i transformi greșeala într-un verdict.`;
    if (source.includes('plictis')) return `${prefix} transforme plictiseala în joacă.`;
    if (source.includes('renunt') || source.includes('nu ii iese')) return `${prefix} continue când ceva nu îi iese.`;
    if (source.includes('repet')) return `${solutionCount} modalități să susții progresul ascuns în jocurile repetate.`;
    if (source.includes('joaca libera') || source.includes('neghidat')) return `${prefix} învețe prin joacă liberă.`;
    if (source.includes('prezent') || source.includes('conex')) return `${solutionCount} modalități să fii prezent fără să conduci jocul copilului.`;
    return `${prefix} transforme joaca în curiozitate, încredere și autonomie.`;
  }

  function strategyAlignedHook(heading) {
    const clean = cleanCarouselText(heading);
    const normalized = normalizedCopy(clean);
    const context = normalizedCopy(`${state.context || ''} ${state.carouselSlides?.[0]?.body || ''}`);
    const generic = ['incurajam ', 'sustinem ', 'promovam ', 'ajutam ', 'dezvoltam ', 'la becky ', 'copiii invata ', 'cum sa ', 'cum putem ', 'modalitati de a '].some(opening => normalized.startsWith(opening));
    if ((generic || normalized.includes('rabdare')) && (context.includes('rabdare') || normalized.includes('rabdare'))) return 'Își pierde răbdarea când ceva nu îi iese?';
    if ((generic || normalized.startsWith('de ce ')) && context.includes('ajutor') && (context.includes('incer') || context.includes('frustr'))) return 'Cere ajutor înainte să încerce singur?';
    if ((generic || normalized.startsWith('de ce ')) && (context.includes('renunt') || context.includes('nu ii iese'))) return 'Renunță când nu îi iese din prima?';
    if ((generic || normalized.startsWith('de ce ')) && context.includes('plictis')) return 'Spune des „M-am plictisit”?';
    if ((generic || normalized.startsWith('de ce ')) && context.includes('repet')) return 'Repetă mereu același joc?';
    if ((generic || normalized.startsWith('de ce ')) && (context.includes('joaca libera') || context.includes('neghidat'))) return 'Joaca neghidată poate avea mai mult sens decât pare.';
    return clean;
  }

  function coverPromiseAfterResize(cover, solutionCount) {
    if (cover?.coverPromiseAuto === false && String(cover.body || '').trim()) {
      return String(cover.body).replace(/^\s*\d+(?=\s+(?:modalități|moduri|răspunsuri|pași|intervenții|întrebări))/i, String(solutionCount));
    }
    return coverPromise(solutionCount);
  }

  function suggestedSolution(index) {
    const source = normalizedCopy(`${state.carouselSlides?.[0]?.heading || ''} ${state.context || ''}`);
    const askingForHelp = [
      ['Nu prelua imediat rezolvarea.', 'Spune-i: „Sunt aici. Arată-mi mai întâi cum ai începe.”'],
      ['Cere-i doar primul pas.', 'Întreabă: „Care ar putea fi primul lucru pe care îl faci?”'],
      ['Restrânge-i opțiunile de început.', 'Dacă încă nu știe, oferă două alegeri simple dintre care să decidă.'],
      ['Oferă cel mai mic indiciu.', 'Orientează-i atenția spre un detaliu, fără să îi arăți întreaga rezolvare.'],
      ['Ajută doar la blocajul numit.', 'Întreabă ce poate face singur și la ce parte precisă are nevoie de tine.']
    ];
    const correction = [
      ['Conectează-te înainte să corectezi.', 'Arată-i că ai observat intenția lui, nu doar ce a ieșit greșit.'],
      ['Vorbește despre rezultat, nu despre copil.', '„Piesa nu se potrivește aici” este diferit de „Nu ești atent.”'],
      ['Cere-i permisiunea să intervii.', '„Vrei să-ți arăt ceva ce am observat?” îi reduce nevoia de a se apăra.'],
      ['Corectează un singur lucru.', 'Prea multe observații simultane transformă ajutorul într-o listă de eșecuri.'],
      ['Lasă-l să facă modificarea.', 'Indică locul problemei, dar păstrează rezolvarea în mâinile lui.']
    ];
    const common = [
      ['Oferă un indiciu, nu soluția.', 'O întrebare scurtă îl sprijină fără să mute descoperirea din mâinile lui.'],
      ['Lasă loc pentru încă o încercare.', 'Câteva clipe fără intervenție îi dau timp să observe, să aleagă și să testeze o idee proprie.'],
      ['Observă efortul, nu doar rezultatul.', 'Spune-i concret ce ai văzut că a încercat, ca să poată recunoaște singur progresul.'],
      ['Încheie cu o întrebare despre proces.', 'Întreabă ce a descoperit sau ce ar schimba; răspunsul lui dă sens experienței.'],
      ['Păstrează provocarea potrivit de mică.', 'Un pas realizabil susține curajul de a continua fără să elimine complet dificultatea.'],
      ['Așteaptă înainte să intervii.', 'O pauză scurtă îi oferă șansa să își adune ideile și să pornească singur următoarea încercare.'],
      ['Împarte dificultatea în pași vizibili.', 'Un obiectiv mai mic face începutul posibil, fără ca adultul să preia rezolvarea.'],
      ['Alege împreună primul pas.', 'Copilul păstrează controlul, iar un punct clar de pornire reduce presiunea de a reuși dintr-odată.'],
      ['Normalizează faptul că uneori este greu.', 'Când dificultatea nu pare un verdict, copilul poate rămâne în proces suficient cât să găsească o cale.'],
      ['Arată-i două opțiuni de început.', 'O alegere limitată reduce blocajul și îi permite copilului să decidă singur cum pornește.'],
      ['Revino la ce a funcționat înainte.', 'Amintirea unei strategii folosite deja îi oferă un reper fără să îi dai răspunsul actual.'],
      ['Lasă rezultatul imperfect să rămână.', 'Când nu reparăm imediat produsul, copilul vede că încercarea lui are valoare și poate evolua.']
    ];
    const boredom = [
      ['Lasă pauza să lucreze.', 'Nu fiecare moment gol cere o activitate pregătită; uneori ideea apare după câteva clipe.'],
      ['Oferă materiale deschise, nu instrucțiuni.', 'Câteva obiecte care pot deveni orice lasă imaginația copilului să aleagă direcția.'],
      ['Urmează ideea pe care o alege.', 'Intră în jocul pornit de copil fără să îi înlocuiești povestea cu un plan de adult.'],
      ['Pune o întrebare care deschide jocul.', '„Ce ar mai putea deveni?” îl ajută să continue fără să primească o soluție gata făcută.'],
      ['Schimbă locul, nu umple programul.', 'O pătură, o masă sau un colț nou poate reaprinde curiozitatea fără o activitate organizată.'],
      ['Alege mai puține obiecte.', 'Un spațiu mai simplu îl ajută să observe posibilitățile, în loc să sară repede de la una la alta.'],
      ['Lasă construcția neterminată la vedere.', 'O idee începută îl invită să revină, să o transforme și să îi găsească singur continuarea.'],
      ['Povestește ce observi, fără să conduci.', 'O observație calmă îi confirmă interesul și îi lasă copilului libertatea de a decide ce urmează.']
    ];
    const repetition = [
      ['Lasă-l să repete fără grabă.', 'Familiaritatea eliberează atenție pentru detalii și alegeri pe care prima încercare le ascunde.'],
      ['Schimbă un singur element.', 'Un material sau o regulă nouă păstrează siguranța jocului și deschide o provocare realizabilă.'],
      ['Observă variația, nu doar noutatea.', 'Spune-i ce a făcut diferit; astfel progresul devine vizibil chiar când jocul pare același.'],
      ['Întreabă ce vrea să testeze acum.', 'Alegerea următoarei variații transformă repetiția într-un proces conștient de explorare.'],
      ['Păstrează materialele la îndemână.', 'Accesul ușor îi permite să revină la idee când este pregătit să încerce ceva nou.'],
      ['Compară împreună două încercări.', 'Diferențele mici îl ajută să observe ce a învățat fără să simtă că este evaluat.'],
      ['Lasă copilul să schimbe regula.', 'O regulă inventată de el transformă exercițiul familiar într-o provocare care îi aparține.'],
      ['Celebrează descoperirea, nu viteza.', 'Atenția pusă pe ce a observat păstrează plăcerea explorării și reduce graba după rezultat.']
    ];
    const presence = [
      ['Observă înainte să propui.', 'Câteva clipe de atenție îți arată ce încearcă deja copilul și unde are nevoie de tine.'],
      ['Intră în joc fără să îl preiei.', 'Acceptă rolul oferit de copil și lasă povestea să rămână condusă de inițiativa lui.'],
      ['Întreabă, în loc să corectezi.', 'O întrebare curioasă îi oferă spațiu să își explice alegerile și să găsească altă cale.'],
      ['Numește momentul împărtășit.', 'O observație simplă despre ce faceți împreună îi arată copilului că atenția ta este acolo.'],
      ['Lasă telefonul în afara jocului.', 'Câteva minute de atenție nefragmentată îi transmit că ideea și invitația lui contează.'],
      ['Urmează ritmul copilului.', 'Pauzele și reluările lui fac parte din joc; nu fiecare moment are nevoie de impulsul adultului.'],
      ['Oferă-i un rol real.', 'Când copilul decide, explică sau te învață ceva, participarea devine conexiune, nu coordonare.'],
      ['Încheiați jocul împreună.', 'Un mic ritual de strâns sau de povestit ce v-a plăcut dă sens timpului petrecut împreună.']
    ];
    const specialized = source.includes('corect') || source.includes('verdict')
      ? correction
      : source.includes('ajutor') && (source.includes('incer') || source.includes('frustr'))
      ? askingForHelp
      : source.includes('plictis')
        ? boredom
        : source.includes('repet')
          ? repetition
          : source.includes('prezent') || source.includes('conex')
            ? presence
            : [];
    const set = specialized.length ? [...specialized, ...common] : common;
    const [heading, body] = set[index % set.length];
    return { heading, body, artworkInstruction: 'Un singur simbol watercolor simplu care face ideea imediat ușor de înțeles.' };
  }

  function nextUnusedSuggestedSolution(existingSlides) {
    const usedHeadings = new Set([
      ...(existingSlides || []).map(slide => normalizedCopy(slide?.heading)),
      ...(state.discardedSolutionHeadings || []).map(normalizedCopy)
    ].filter(Boolean));
    const candidateCount = 24;
    for (let index = 0; index < candidateCount; index += 1) {
      const candidate = suggestedSolution(index);
      if (!usedHeadings.has(normalizedCopy(candidate.heading))) return candidate;
    }
    return suggestedSolution((existingSlides || []).length);
  }

  function solutionIsPractical(heading) {
    const normalized = normalizedCopy(heading);
    if (normalized.startsWith('nu prelua ') || normalized.startsWith('nu rezolva ')) return true;
    const firstWord = normalized.split(' ')[0];
    return ['asteapta', 'ofera', 'lasa', 'observa', 'intreaba', 'pastreaza', 'urmeaza', 'intra', 'schimba', 'repeta', 'incepe', 'alege', 'numeste', 'imparte', 'redu', 'creeaza', 'cere', 'restrange', 'confirma', 'arata', 'spune', 'conecteaza', 'vorbeste', 'corecteaza'].includes(firstWord);
  }

  function beckyCta() {
    const source = normalizedCopy(`${state.context || ''} ${state.carouselSlides?.[0]?.heading || ''} ${state.carouselSlides?.[0]?.body || ''}`);
    const emojiPools = source.includes('corect') || source.includes('verdict')
      ? ['💬', '🤝', '🌱']
      : source.includes('ajutor') || source.includes('frustr') || source.includes('rabdare') || source.includes('renunt') || source.includes('incer')
      ? ['🌱', '💛', '✨']
      : source.includes('plictis') || source.includes('joaca libera') || source.includes('neghidat')
        ? ['🌈', '🎨', '✨']
        : source.includes('repet')
          ? ['🧩', '🔄', '🌱']
          : source.includes('prezent') || source.includes('conex') || source.includes('impreuna')
            ? ['💛', '🤗', '🫶']
            : ['💬', '🌟', '💡'];
    const emojiSeed = [...source].reduce((total, character) => (total + character.codePointAt(0)) % 997, 0);
    const commentBody = `Scrie-ne în comentarii ce funcționează la voi. Ideea ta poate inspira și alți părinți. ${emojiPools[emojiSeed % emojiPools.length]}`;
    if (source.includes('corect') || source.includes('verdict')) return {
      heading: 'Ce fel de corectare acceptă mai ușor copilul tău?',
      body: commentBody,
      artworkInstruction: 'O bulă de conversație watercolor simplă, cu două forme care se apropie și sugerează ascultare fără judecată.'
    };
    if (source.includes('ajutor') || source.includes('frustr') || source.includes('rabdare') || source.includes('renunt') || source.includes('incer')) return {
      heading: 'Tu cum îi dai curaj să încerce singur?',
      body: commentBody,
      artworkInstruction: 'O bulă de conversație watercolor simplă, cu o inimă mică și o steluță care sugerează curaj și idei împărtășite.'
    };
    if (source.includes('plictis') || source.includes('joaca libera') || source.includes('neghidat')) return {
      heading: 'Ce pornește imaginația copilului tău?',
      body: commentBody,
      artworkInstruction: 'O bulă de conversație watercolor simplă din care pornesc o stea, un cub și o linie jucăușă.'
    };
    if (source.includes('repet')) return {
      heading: 'Ce joc ar repeta copilul tău la nesfârșit?',
      body: commentBody,
      artworkInstruction: 'Două săgeți watercolor moi care formează un cerc în jurul unei steluțe simple.'
    };
    if (source.includes('prezent') || source.includes('conex') || source.includes('impreuna')) return {
      heading: 'Cum vă place să vă conectați prin joacă?',
      body: commentBody,
      artworkInstruction: 'Două forme watercolor simple care se întâlnesc și alcătuiesc o inimă.'
    };
    return {
      heading: 'Ce idee ai încerca împreună cu copilul tău?',
      body: commentBody,
      artworkInstruction: 'O bulă de conversație watercolor simplă, cu o inimă și o steluță discretă.'
    };
  }

  function suggestedPostCaption() {
    const source = normalizedCopy(`${state.context || ''} ${state.carouselSlides?.[0]?.heading || ''} ${state.carouselSlides?.[0]?.body || ''}`);
    if (source.includes('corect') || source.includes('verdict')) return `Uneori, nu corectarea îl doare, ci felul în care ajunge la el. 💛

Cum îl ajuți să audă îndrumarea fără să simtă că este el greșeala?`;
    if (source.includes('ajutor') && (source.includes('incer') || source.includes('primul pas'))) return `Uneori, copilul cere ajutor nu pentru că nu poate, ci pentru că începutul pare prea mare. 💛

Cum îl sprijini fără să îi iei bucuria primului pas?`;
    if (source.includes('plictis')) return `Uneori, „M-am plictisit” nu este capătul jocului, ci locul din care poate începe o idee. 🌈

Cum îi lași spațiu să o găsească singur?`;
    if (source.includes('repet')) return `Uneori, jocul care pare mereu la fel ascunde schimbări pe care doar copilul le simte. 🧩

Tu ce observi nou în lucrurile pe care le repetă?`;
    return `În joacă, copilul nu descoperă doar cum funcționează lucrurile. Descoperă și că poate încerca din nou. 💛

Ce vă place să descoperiți împreună?`;
  }

  function postCaptionPanel() {
    const caption = String(state.postCaptionStyle === 'teaser-v1' && state.postCaption ? state.postCaption : suggestedPostCaption()).trim();
    return `<section class="cc-post-caption"><header><div><small>DESCRIEREA POSTĂRII</small><h3>Caption sugerat</h3><p>Este atașat draftului, se salvează odată cu postarea și îl poți edita înainte de publicare.</p></div><button type="button" class="cc-back" data-cc-copy-caption>Copiază textul</button></header><textarea data-cc-post-caption aria-label="Descrierea postării">${safe(caption)}</textarea><span data-cc-caption-status>Sugestie adaptată automat la subiect.</span></section>`;
  }

  function fitCarouselCopyPlan(slides, desiredCount = carouselSlideCount()) {
    const count = Math.max(MIN_CAROUSEL_SLIDES, Math.min(MAX_CAROUSEL_SLIDES, desiredCount));
    const source = Array.isArray(slides) ? slides.map(slide => ({ ...slide })) : [];
    const cover = source.shift() || {};
    const ctaSource = source.pop() || {};
    source.forEach((slide, index) => {
      if (slide.solutionAuto !== false && !solutionIsPractical(slide.heading)) source[index] = { ...slide, ...suggestedSolution(index) };
    });
    while (source.length > count - 2) source.pop();
    while (source.length < count - 2) source.push(suggestedSolution(source.length));
    const cta = beckyCta();
    const finalSlide = ctaSource.preserveFinal
      ? { ...ctaSource, body: cta.body, preserveFinal: true }
      : { ...ctaSource, ...cta };
    return [
      { ...cover, heading: strategyAlignedHook(cover.heading), body: cover.coverPromiseAuto === false && cover.body ? cover.body : coverPromise(source.length) },
      ...source,
      { ...finalSlide, artworkInstruction: finalSlide.artworkInstruction || '' }
    ];
  }

  const carouselVariantGuidance = {
    'story-cards': {
      when: 'Ai o situație parentală concretă și vrei ca slide-urile să construiască, în ordine, o singură cale de răspuns.',
      looks: 'Titlu mare → explicație scurtă → ilustrație simplă. Ritm clar și ușor de parcurs.',
      character: 'Becky apare rar, doar când ajută mesajul.'
    },
    'photo-editorial': {
      when: 'Vrei o impresie mai premium, calmă și emoțională, bazată pe atmosferă și compoziții aerisite.',
      looks: 'Imagini mai mari, text puțin și mult spațiu alb — ca o pagină de revistă.',
      character: 'Personajul rămâne discret, ca accent vizual, nu ca protagonist.'
    },
    'playful-guide': {
      when: 'Explici pași, activități sau beneficii și vrei mai multă energie vizuală pentru copii și părinți.',
      looks: 'Pași numerotați, simboluri, ilustrații și accente jucăușe care ghidează privirea.',
      character: 'Becky poate avea un rol mai vizibil, dar rămâne controlată ca să nu aglomereze.'
    }
  };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        ...defaults,
        ...saved,
        contentItemId: saved.contentItemId || '',
        campaigns: Array.isArray(saved.campaigns) ? saved.campaigns : defaults.campaigns.map(item => ({ ...item })),
        savedIdeas: Array.isArray(saved.savedIdeas) ? saved.savedIdeas : [],
        brandSettings: { ...defaults.brandSettings, ...(saved.brandSettings || {}) }
      };
    }
    catch { return { ...defaults }; }
  }

  let state = loadState();
  let generatedSlides = [];
  let frozenComposedSlides = [];
  let carouselVersions = [];
  let carouselDrafts = [];
  let draftPersistTimer = null;
  let versionBusy = false;
  let versionMessage = '';
  let deliveryMessage = '';
  let copyDraftBusy = false;
  let copyDraftError = '';
  let copyDraftNotice = '';
  let carouselBusy = false;
  let carouselProgress = 0;
  let carouselTarget = 0;
  let carouselOperation = 'all';
  let carouselError = '';
  let slideAssistantBusy = -1;
  let slideRegeneratingIndex = -1;
  let textApplyBusy = -1;
  let slideAssistantMessage = '';
  let previewCompositionRevision = 0;
  const GENERATED_DB_NAME = 'becky-content-director-generated-v1';
  const GENERATED_DB_STORE = 'carousel-drafts';

  function generatedSignature() {
    return JSON.stringify({ objective: state.objective, angle: state.angle, format: state.format, variant: state.carouselVariant, slides: state.carouselSlides.map(slide => slide?.title || '') });
  }

  function openGeneratedDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB unavailable'));
      const request = indexedDB.open(GENERATED_DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(GENERATED_DB_STORE, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function cloneValue(value) {
    return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function dataUrlToBlob(dataUrl) {
    const [header, encoded] = String(dataUrl).split(',');
    const mimeType = header.match(/^data:([^;]+)/)?.[1] || 'image/png';
    const bytes = Uint8Array.from(atob(encoded || ''), character => character.charCodeAt(0));
    return new Blob([bytes], { type: mimeType });
  }

  async function putGeneratedRecord(payload) {
    const database = await openGeneratedDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(GENERATED_DB_STORE, 'readwrite');
      transaction.objectStore(GENERATED_DB_STORE).put(payload);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }

  function draftRecordId(contentItemId = state.contentItemId) {
    return contentItemId ? `draft:${contentItemId}` : '';
  }

  function draftHasMeaningfulContent(draftState = state, slides = generatedSlides) {
    return Boolean(
      String(draftState?.context || '').trim()
      || (Array.isArray(slides) && slides.length)
      || draftState?.carouselSlides?.some(slide => String(slide?.heading || slide?.body || slide?.change || '').trim())
    );
  }

  async function deleteDraftRecord(contentItemId = state.contentItemId) {
    const id = draftRecordId(contentItemId);
    if (!id) return;
    const database = await openGeneratedDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(GENERATED_DB_STORE, 'readwrite');
      transaction.objectStore(GENERATED_DB_STORE).delete(id);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
    carouselDrafts = carouselDrafts.filter(draft => draft.contentItemId !== contentItemId);
  }

  async function deleteAbandonedDraft(contentItemId = state.contentItemId) {
    if (!contentItemId) return;
    clearTimeout(draftPersistTimer);
    const database = await openGeneratedDatabase();
    const records = await new Promise((resolve, reject) => {
      const request = database.transaction(GENERATED_DB_STORE, 'readonly').objectStore(GENERATED_DB_STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(GENERATED_DB_STORE, 'readwrite');
      const store = transaction.objectStore(GENERATED_DB_STORE);
      store.delete(draftRecordId(contentItemId));
      store.delete('current');
      records
        .filter(record => String(record.id).startsWith('version:') && record.automatic && record.state?.contentItemId === contentItemId)
        .forEach(record => store.delete(record.id));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
    try { sessionStorage.removeItem(GENERATED_DB_NAME); } catch {}
    carouselDrafts = carouselDrafts.filter(draft => draft.contentItemId !== contentItemId);
    carouselVersions = carouselVersions.filter(version => !(version.automatic && version.contentKey === contentItemId));
  }

  async function persistCurrentDraft() {
    if (!state.contentItemId || !draftHasMeaningfulContent()) return;
    const payload = {
      id: draftRecordId(),
      contentItemId: state.contentItemId,
      state: cloneValue(state),
      slides: cloneValue(generatedSlides),
      composedSlides: cloneValue(frozenComposedSlides),
      updatedAt: state.updatedAt || new Date().toISOString()
    };
    await putGeneratedRecord(payload);
    const campaign = state.campaigns?.find(item => item.id === state.activeCampaignId);
    const summary = {
      id: payload.id,
      contentItemId: payload.contentItemId,
      state: payload.state,
      slides: payload.slides,
      updatedAt: payload.updatedAt,
      campaignName: campaign?.name || 'Fără campanie'
    };
    carouselDrafts = [summary, ...carouselDrafts.filter(draft => draft.contentItemId !== summary.contentItemId)]
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  function scheduleDraftPersistence() {
    clearTimeout(draftPersistTimer);
    draftPersistTimer = setTimeout(() => persistCurrentDraft().catch(() => {}), 350);
  }

  async function loadCarouselDrafts(renderAfter = false) {
    try {
      const database = await openGeneratedDatabase();
      const records = await new Promise((resolve, reject) => {
        const request = database.transaction(GENERATED_DB_STORE, 'readonly').objectStore(GENERATED_DB_STORE).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      database.close();
      const persistedDrafts = records
        .filter(record => String(record.id).startsWith('draft:') && record.state?.contentItemId && draftHasMeaningfulContent(record.state, record.slides))
        .map(record => ({
          id: record.id,
          contentItemId: record.state.contentItemId,
          state: record.state,
          slides: Array.isArray(record.slides) ? record.slides : [],
          composedSlides: Array.isArray(record.composedSlides) ? record.composedSlides : [],
          updatedAt: record.updatedAt || record.state.updatedAt,
          campaignName: record.state.campaigns?.find(item => item.id === record.state.activeCampaignId)?.name || 'Fără campanie'
        }));
      const manuallySavedKeys = new Set(records
        .filter(record => String(record.id).startsWith('version:') && !record.automatic)
        .map(record => record.state?.contentItemId || `legacy:${record.signature || record.id}`));
      const existingDraftKeys = new Set(persistedDrafts.map(draft => draft.contentItemId));
      const recoveredBackups = new Map();
      records
        .filter(record => String(record.id).startsWith('version:') && record.automatic && record.state?.contentItemId && !manuallySavedKeys.has(record.state.contentItemId) && !existingDraftKeys.has(record.state.contentItemId))
        .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))
        .forEach(record => {
          if (recoveredBackups.has(record.state.contentItemId)) return;
          recoveredBackups.set(record.state.contentItemId, {
            id: record.id,
            contentItemId: record.state.contentItemId,
            state: record.state,
            slides: Array.isArray(record.slides) ? record.slides : [],
            composedSlides: Array.isArray(record.composedSlides) ? record.composedSlides : [],
            updatedAt: record.savedAt || record.state.updatedAt,
            campaignName: record.state.campaigns?.find(item => item.id === record.state.activeCampaignId)?.name || 'Fără campanie',
            recoveredFromBackup: true
          });
        });
      carouselDrafts = [...persistedDrafts, ...recoveredBackups.values()]
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      if (renderAfter && typeof render === 'function') render(true);
    } catch {
      carouselDrafts = [];
    }
  }

  async function restoreDraft(contentItemId) {
    await persistCurrentDraft().catch(() => {});
    let payload = carouselDrafts.find(draft => draft.contentItemId === contentItemId) || null;
    if (!payload) {
      const database = await openGeneratedDatabase();
      payload = await new Promise((resolve, reject) => {
        const request = database.transaction(GENERATED_DB_STORE, 'readonly').objectStore(GENERATED_DB_STORE).get(draftRecordId(contentItemId));
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      database.close();
    }
    if (!payload?.state) throw new Error('Draftul nu mai este disponibil.');
    state = { ...defaults, ...cloneValue(payload.state), contentView: 'create' };
    generatedSlides = Array.isArray(payload.slides) ? cloneValue(payload.slides) : [];
    frozenComposedSlides = Array.isArray(payload.composedSlides) ? cloneValue(payload.composedSlides) : [];
    frozenComposedSlides = frozenComposedSlides.map(() => null);
    save(false);
    await persistGeneratedSlides();
  }

  async function persistGeneratedSlides() {
    if (!generatedSlides.length) return;
    const payload = { id: 'current', signature: generatedSignature(), slides: generatedSlides, composedSlides: frozenComposedSlides, savedAt: new Date().toISOString() };
    try {
      await putGeneratedRecord(payload);
    } catch {
      try { sessionStorage.setItem(GENERATED_DB_NAME, JSON.stringify(payload)); } catch {}
    }
  }

  async function clearPersistedGeneratedSlides() {
    frozenComposedSlides = [];
    try {
      const database = await openGeneratedDatabase();
      await new Promise((resolve, reject) => { const transaction = database.transaction(GENERATED_DB_STORE, 'readwrite'); transaction.objectStore(GENERATED_DB_STORE).delete('current'); transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); });
      database.close();
    } catch {}
    try { sessionStorage.removeItem(GENERATED_DB_NAME); } catch {}
  }

  async function restoreGeneratedSlides() {
    let payload = null;
    try {
      const database = await openGeneratedDatabase();
      payload = await new Promise((resolve, reject) => { const request = database.transaction(GENERATED_DB_STORE, 'readonly').objectStore(GENERATED_DB_STORE).get('current'); request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error); });
      database.close();
    } catch {
      try { payload = JSON.parse(sessionStorage.getItem(GENERATED_DB_NAME) || 'null'); } catch {}
    }
    if (payload?.signature === generatedSignature() && Array.isArray(payload.slides) && payload.slides.length) {
      generatedSlides = payload.slides;
      frozenComposedSlides = Array.isArray(payload.composedSlides) ? payload.composedSlides : [];
      // The active cover must always be recomposed with the current spacing
      // and solution-number rules. Intentionally saved versions keep their
      // own frozen PNGs until they are opened explicitly.
      frozenComposedSlides = frozenComposedSlides.map(() => null);
      if (state.step === 4 && typeof render === 'function') render(true);
    }
  }

  async function loadCarouselVersions(renderAfter = false) {
    try {
      const database = await openGeneratedDatabase();
      const records = await new Promise((resolve, reject) => {
        const request = database.transaction(GENERATED_DB_STORE, 'readonly').objectStore(GENERATED_DB_STORE).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      database.close();
      carouselVersions = records
        .filter(record => String(record.id).startsWith('version:'))
        .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))
        .map(record => {
          const campaignId = record.state?.activeCampaignId || '';
          const campaign = record.state?.campaigns?.find(item => item.id === campaignId);
          return {
            id: record.id,
            name: record.name,
            savedAt: record.savedAt,
            campaignId,
            campaignName: campaign?.name || 'Fără campanie',
            automatic: Boolean(record.automatic),
            contentKey: record.state?.contentItemId || `legacy:${record.signature || record.id}`
          };
        });
      if (renderAfter && typeof render === 'function') render(true);
    } catch {
      carouselVersions = [];
    }
  }

  async function saveCarouselVersion(name, { automatic = false, versionId = null } = {}) {
    const plan = carouselPlan();
    if (!plan.every((_, index) => Boolean(generatedSlides[index]))) throw new Error('Carouselul nu este complet.');
    const composedSlides = [];
    for (let index = 0; index < plan.length; index += 1) {
      composedSlides[index] = await blobToDataUrl(await composeSlide(index));
    }
    const savedAt = new Date().toISOString();
    const defaultName = automatic
      ? 'Backup automat înainte de regenerare'
      : `Versiunea ${carouselVersions.filter(version => !version.automatic && version.contentKey === currentContentKey()).length + 1}`;
    const payload = {
      id: versionId || `version:${Date.now()}:${Math.random().toString(16).slice(2)}`,
      name: String(name || '').trim() || defaultName,
      signature: generatedSignature(),
      state: cloneValue(state),
      slides: cloneValue(generatedSlides),
      composedSlides,
      savedAt,
      automatic
    };
    await putGeneratedRecord(payload);
    await loadCarouselVersions(false);
    if (!automatic) {
      clearTimeout(draftPersistTimer);
      await deleteDraftRecord(payload.state.contentItemId);
    }
    return payload;
  }

  async function restoreCarouselVersion(versionId) {
    const currentCampaigns = cloneValue(state.campaigns || []);
    const currentBrandSettings = cloneValue(state.brandSettings || defaults.brandSettings);
    const database = await openGeneratedDatabase();
    const payload = await new Promise((resolve, reject) => {
      const request = database.transaction(GENERATED_DB_STORE, 'readonly').objectStore(GENERATED_DB_STORE).get(versionId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    database.close();
    if (!payload?.state || !Array.isArray(payload.slides)) throw new Error('Versiunea salvată nu mai este disponibilă.');
    state = {
      ...defaults,
      ...cloneValue(payload.state),
      brandSettings: { ...defaults.brandSettings, ...currentBrandSettings },
      campaigns: currentCampaigns,
      activeCampaignId: currentCampaigns.some(item => item.id === payload.state.activeCampaignId) ? payload.state.activeCampaignId : state.activeCampaignId,
      contentView: 'create',
      step: 4
    };
    generatedSlides = cloneValue(payload.slides);
    frozenComposedSlides = Array.isArray(payload.composedSlides) ? cloneValue(payload.composedSlides) : [];
    frozenComposedSlides[0] = null;
    save(false);
    await persistGeneratedSlides();
    versionMessage = `Ai deschis „${payload.name}”. Este păstrată exact cum a fost salvată.`;
  }

  function invalidateFrozenSlide(index) {
    if (frozenComposedSlides[index]) {
      frozenComposedSlides[index] = null;
      persistGeneratedSlides();
    }
  }
  restoreGeneratedSlides();
  loadCarouselVersions(true);
  loadCarouselDrafts(true);
  // Full carousel generation is active; the cover remains deterministic and does not waste an image API call.
  const DEVELOPMENT_SINGLE_IMAGE_MODE = false;
  const DEVELOPMENT_GENERATED_SLIDE_INDEX = 1;
  const carouselAssets = {
    clouds: '/assets/content_assets/base_clouds.png',
    headerClouds: '/assets/content_assets/header_clouds.png',
    logo: '/assets/logo/LOGOMARK.png',
    decorations: [
      '/assets/content_assets/bg-small-assets/image 166.png',
      '/assets/content_assets/bg-small-assets/image 168.png',
      '/assets/content_assets/bg-small-assets/image 167.png'
    ],
    ctaSlides: Array.from({ length: 8 }, (_, index) => `/assets/content_assets/final_CTA_carusel/carusel_final_CTA_${String(index + 1).padStart(2, '0')}.png`),
    characters: {
      'story-cards': [
        { index: 0, src: '/assets/content_assets/becky_duck/duck9.png', side: 'center', layer: 'back' },
        { index: 2, src: '/assets/content_assets/male_duck/male_duck_07.png', side: 'left', layer: 'back' },
        { index: 3, src: '/assets/content_assets/becky_duck/duck2.png', side: 'right', layer: 'back', wide: true }
      ],
      'photo-editorial': [
        { index: 0, src: '/assets/content_assets/becky_duck/duck1.png', side: 'center', layer: 'back' },
        { index: 2, src: '/assets/content_assets/male_duck/male_duck_04.png', side: 'left', layer: 'front' },
        { index: 3, src: '/assets/content_assets/becky_duck/duck8.png', side: 'right', layer: 'back', wide: true }
      ],
      'playful-guide': [
        { index: 0, src: '/assets/content_assets/becky_duck/duck6.png', side: 'center', layer: 'back' },
        { index: 2, src: '/assets/content_assets/male_duck/male_duck_08.png', side: 'left', layer: 'back' },
        { index: 3, src: '/assets/content_assets/becky_duck/duck3.png', side: 'right', layer: 'front' }
      ]
    }
  };
  const save = (touchContent = true) => {
    if (touchContent) state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (touchContent) scheduleDraftPersistence();
  };
  const contentRouteIsActive = () => new URLSearchParams(window.location.search).get('view') === 'content';
  const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[character]);

  function prepareShell() {
    const demo = document.getElementById('workspace-demo');
    if (!demo) return null;
    document.body.dataset.workspace = 'content';
    document.querySelector('.workspace')?.classList.add('hidden');
    document.getElementById('css-workspace')?.classList.add('hidden');
    document.getElementById('empty')?.classList.add('hidden');
    document.getElementById('editor')?.classList.add('hidden');
    document.querySelector('.top-actions')?.classList.add('overview-actions-hidden');
    document.querySelector('.topbar h1').textContent = 'Content Director';
    document.querySelector('.topbar .subtitle').textContent = 'De la idee la content coerent, pregătit pentru generare.';
    document.querySelectorAll('.sidebar .side-link').forEach(link => link.classList.toggle('active', link.classList.contains('content-creator-link')));
    demo.className = 'workspace-demo content-creator-workspace';
    demo.classList.remove('hidden');
    return demo;
  }

  const contentViews = [
    ['home', 'Acasă'],
    ['create', 'Creează'],
    ['ideas', 'Idei'],
    ['campaigns', 'Campanii'],
    ['content', 'Conținut'],
    ['brand', 'Brand']
  ];

  function activeCampaign() {
    return (state.campaigns || []).find(campaign => campaign.id === state.activeCampaignId) || null;
  }

  function formatSavedDate(value) {
    if (!value) return 'Nesalvat încă';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Nesalvat încă';
    return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) + ' · ' + date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  }

  function currentContentKey() {
    return state.contentItemId || `legacy:${generatedSignature()}`;
  }

  function latestManualVersionForCurrentWork() {
    return carouselVersions
      .filter(version => !version.automatic && version.contentKey === currentContentKey())
      .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))[0] || null;
  }

  function hasUnsavedCurrentWork() {
    const hasWork = Boolean(String(state.context || '').trim() || generatedSlides.length || state.updatedAt);
    if (!hasWork) return false;
    const latestManualVersion = latestManualVersionForCurrentWork();
    if (!latestManualVersion) return true;
    const changedAt = new Date(state.updatedAt || 0).getTime();
    const savedAt = new Date(latestManualVersion.savedAt || 0).getTime();
    return Number.isFinite(changedAt) && Number.isFinite(savedAt) && changedAt > savedAt;
  }

  function draftTitle(draftState) {
    const cover = draftState?.carouselSlides?.[0]?.heading;
    if (cover) return cover;
    const context = String(draftState?.context || '').replace(/\s+/g, ' ').trim();
    if (context) return context.length > 92 ? `${context.slice(0, 89)}…` : context;
    return 'Postare nouă';
  }

  function unsavedDrafts() {
    const savedKeys = new Set(carouselVersions.filter(version => !version.automatic).map(version => version.contentKey));
    const drafts = carouselDrafts.filter(draft => !savedKeys.has(draft.contentItemId));
    if (hasUnsavedCurrentWork() && state.contentItemId && !savedKeys.has(state.contentItemId)) {
      const current = {
        contentItemId: state.contentItemId,
        state: cloneValue(state),
        slides: cloneValue(generatedSlides),
        updatedAt: state.updatedAt,
        campaignName: activeCampaign()?.name || 'Fără campanie'
      };
      return [current, ...drafts.filter(draft => draft.contentItemId !== current.contentItemId)]
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    }
    return drafts.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  function draftListMarkup(drafts) {
    return `<div class="cc-draft-list">${drafts.map(draft => {
      const hasImages = draft.slides?.length >= 5;
      return `<article><div class="cc-item-icon">${hasImages ? '▦' : '✎'}</div><div><small>${hasImages ? 'CAROUSEL GENERAT · NESALVAT' : 'DRAFT NESALVAT'}</small><h3>${safe(draftTitle(draft.state))}</h3><p>${safe(draft.campaignName)} · ${formatSavedDate(draft.updatedAt)}</p></div><button type="button" class="cc-primary" data-cc-open-draft="${safe(draft.contentItemId)}">${hasImages ? 'Deschide și editează' : 'Continuă draftul'} →</button></article>`;
    }).join('')}</div>`;
  }

  function groupedContentItems() {
    const groups = new Map();
    carouselVersions.forEach(version => {
      const group = groups.get(version.contentKey) || { key: version.contentKey, manual: [], backups: [] };
      (version.automatic ? group.backups : group.manual).push(version);
      groups.set(version.contentKey, group);
    });
    return [...groups.values()]
      .filter(group => group.manual.length)
      .map(group => ({ ...group, latest: group.manual[0] }))
      .sort((a, b) => String(b.latest.savedAt).localeCompare(String(a.latest.savedAt)));
  }

  function contentDirectorNav() {
    const campaign = activeCampaign();
    return `<div class="cc-os-top">
      <nav class="cc-os-nav" aria-label="Navigare Content Director">
        ${contentViews.map(([key, label]) => `<button type="button" data-cc-view="${key}" class="${state.contentView === key ? 'is-active' : ''}">${label}</button>`).join('')}
      </nav>
      <button type="button" class="cc-campaign-context" data-cc-view="campaigns"><small>CAMPANIA CURENTĂ</small><strong>${safe(campaign?.name || 'Fără campanie')}</strong><span>Schimbă →</span></button>
    </div>`;
  }

  function currentWorkSummary() {
    const chosenAngle = angleFor(state.angle);
    const hasGeneratedCarousel = generatedSlides.length >= carouselSlideCount();
    if (!hasUnsavedCurrentWork()) return '';
    return `<article class="cc-current-work">
      <div class="cc-item-icon">${hasGeneratedCarousel ? '▦' : '✎'}</div>
      <div><small>${hasGeneratedCarousel ? 'CAROUSEL GENERAT' : 'DRAFT ÎN LUCRU'}</small><h3>${safe(chosenAngle?.hook || state.context || 'Postare nouă')}</h3><p>${safe(activeCampaign()?.name || 'Fără campanie')} · ${safe(formats[state.format]?.label || 'Format neales')} · ${formatSavedDate(state.updatedAt)}</p></div>
      <button type="button" class="cc-primary" data-cc-continue>${hasGeneratedCarousel ? 'Deschide și editează' : 'Continuă draftul'} →</button>
    </article>`;
  }

  function homeView() {
    const campaign = activeCampaign();
    const savedPosts = groupedContentItems().slice(0, 3);
    const drafts = unsavedDrafts();
    return `<main class="cc-os-page cc-home-page">
      <header class="cc-page-intro"><div><small>OVERVIEW</small><h2>De unde vrei să continui?</h2><p>Aici vezi ce este în lucru, ce ai salvat și unde aparține fiecare postare.</p></div></header>
      <section class="cc-start-grid" aria-label="Începe conținut nou">
        <button type="button" data-cc-start="ideas"><span>✦</span><div><small>VREAU O DIRECȚIE NOUĂ</small><strong>Dă-mi idei</strong><p>Primești perspective, hook-uri și o structură de carousel din care alegi.</p></div><b>→</b></button>
        <button type="button" data-cc-start="own"><span>＋</span><div><small>ȘTIU DEJA CE VREAU</small><strong>Încep cu ideea mea</strong><p>Scrii contextul, alegi obiectivul și construim postarea împreună.</p></div><b>→</b></button>
      </section>
      ${drafts.length ? `<section class="cc-dashboard-section"><div class="cc-section-title"><div><small>ÎN LUCRU</small><h3>Continuă ce ai început</h3></div><button type="button" data-cc-view="content">Vezi toate cele ${drafts.length} →</button></div>${draftListMarkup(drafts.slice(0, 3))}</section>` : ''}
      <div class="cc-dashboard-columns">
        <section class="cc-dashboard-card"><div class="cc-section-title"><div><small>CAMPANIE ACTIVĂ</small><h3>${safe(campaign?.name || 'Nicio campanie aleasă')}</h3></div><button type="button" data-cc-view="campaigns">Gestionează →</button></div><p>${safe(campaign?.objective || 'Creează o campanie pentru a grupa postările după obiectiv.')}</p><div class="cc-card-stat"><strong>${(state.campaigns || []).filter(item => item.status === 'active').length}</strong><span>campanii active</span></div></section>
        <section class="cc-dashboard-card"><div class="cc-section-title"><div><small>POSTĂRILE MELE</small><h3>Salvate intenționat de tine</h3></div><button type="button" data-cc-view="content">Deschide biblioteca →</button></div>${savedPosts.length ? `<div class="cc-mini-list">${savedPosts.map(post => `<button type="button" data-cc-open-content="${safe(post.key)}"><span>◆</span><div><strong>${safe(post.latest.name)}</strong><small>${safe(post.latest.campaignName)} · ${formatSavedDate(post.latest.savedAt)}</small></div><b>→</b></button>`).join('')}</div>` : '<p>Salvează prima versiune finală din editor și va apărea aici. Backupurile automate rămân ascunse.</p>'}</section>
      </div>
      <section class="cc-brand-shortcut"><div><span>Aa</span><div><small>VOCEA BRANDULUI</small><strong>${safe(state.brandSettings.voice)}</strong><p>Regulile folosite pentru ton, vocabular și CTA.</p></div></div><button type="button" data-cc-view="brand">Modifică vocea →</button></section>
    </main>`;
  }

  const preparedCarouselPosts = [
    {
      number: 9,
      hook: 'Știe ce are de făcut, dar se grăbește?',
      value: 'Un ritual în trei pași care creează o pauză între impuls și acțiune.',
      context: 'Copilul se grăbește și greșește lucruri pe care le știe. Exersați același ritual scurt înainte de acțiune: oprește, observă, alege.',
      coverBody: '3 pași care îl ajută să se oprească înainte de a acționa.',
      steps: [
        ['Oprește.', 'Folosiți același semnal scurt: un cuvânt, un gest sau o respirație.'],
        ['Observă.', 'Întreabă: „Ce trebuie să vezi înainte să începi?”'],
        ['Alege.', 'Lasă-l să spună primul pas înainte să-l facă.']
      ],
      final: 'Oprește. Observă. Alege. Un ritual simplu, repetat până devine al lui.',
      caption: 'Uneori, nu lipsa răspunsului îl încurcă, ci graba de a ajunge la el. 💛\n\nCum îl ajuți să facă loc unei clipe înainte de acțiune?'
    },
    {
      number: 11,
      hook: 'Trebuie să câștige de fiecare dată?',
      value: 'Șase intervenții prin care pierderea se exersează în jocuri mici, fără rușinare.',
      context: 'Copilul vrea să fie mereu primul sau să câștige și se destabilizează când pierde. Postarea exersează pierderea treptat, în jocuri scurte și cu limite clare.',
      coverBody: '6 moduri prin care exersați pierderea fără să transformați jocul într-o luptă.',
      steps: [
        ['Începeți cu jocuri scurte.', 'O pierdere de două minute este mai ușor de gestionat decât una după mult efort.'],
        ['Anunță posibilitatea pierderii.', '„Uneori câștigăm, alteori exersăm cum continuăm.”'],
        ['Nu pierde intenționat mereu.', 'Victoria permanentă nu îl pregătește pentru un rezultat real.'],
        ['Modelează reacția potrivită.', 'Lasă-l să te vadă pierzând fără furie și fără să minimalizezi jocul.'],
        ['Observă revenirea.', '„Ai fost dezamăgit și totuși ai rămas în joc.”'],
        ['Opriți jocul dacă devine distructiv.', 'Emoția este acceptată; lovirea, aruncarea sau jignirea nu sunt.']
      ],
      final: 'A pierde se învață în jocuri mici, nu în mijlocul unei crize.',
      caption: 'Uneori, pentru copil, pierderea nu înseamnă doar finalul jocului, ci pierderea controlului. 💛\n\nCum îl ajuți să rămână în joc când nu este primul?'
    },
    {
      number: 12,
      hook: 'Schimbă regulile când începe să piardă?',
      value: 'Patru pași care separă negocierea sănătoasă de schimbarea regulilor după rezultat.',
      context: 'Copilul schimbă regulile atunci când începe să piardă. Regulile sunt negociate înainte, iar în timpul jocului alegerea este între continuare și oprire.',
      coverBody: '4 pași care păstrează jocul corect fără o negociere nesfârșită.',
      steps: [
        ['Stabiliți regulile înainte.', 'Cere-i să spună și el cum se câștigă înainte de începerea jocului.'],
        ['Separați variantele de excepții.', 'Regulile pot fi schimbate pentru jocul următor, nu în funcție de cine conduce acum.'],
        ['Numește ce observi.', '„Vrei o regulă nouă acum, când rezultatul nu îți mai place.”'],
        ['Oferă o alegere clară.', 'Continuați cu regulile stabilite sau opriți jocul și reluați altădată.']
      ],
      final: 'Regulile pot fi negociate înainte. În timpul jocului, sunt păstrate.',
      caption: 'Uneori, regula se schimbă exact când rezultatul începe să doară. 🎲\n\nCum păstrezi jocul corect fără să intri într-o negociere nesfârșită?'
    },
    {
      number: 13,
      hook: 'Copiază mereu ideile altor copii?',
      value: 'Trei pași prin care imitația devine punct de plecare pentru o alegere proprie.',
      context: 'Copilul copiază imediat ce face alt copil. Copierea este tratată ca etapă de învățare, apoi adultul invită o singură schimbare proprie.',
      coverBody: '3 pași prin care modelul văzut devine punct de plecare, nu produs final.',
      steps: [
        ['Lasă-l să observe.', 'Copierea este adesea o etapă firească prin care copilul înțelege cum funcționează ceva.'],
        ['Cere o singură schimbare.', '„Ce ai putea face diferit: culoarea, forma sau povestea?”'],
        ['Pune-i în valoare alegerea.', 'Observă exact elementul pe care l-a adăugat sau modificat singur.']
      ],
      final: 'Originalitatea nu începe de la zero. Începe cu o alegere proprie.',
      caption: 'Uneori, o idee proprie începe prin a privi atent ideea altcuiva. 🌱\n\nCum transformi imitația într-un punct de plecare, nu într-un verdict?'
    },
    {
      number: 15,
      hook: 'Te întreabă la fiecare pas: „E bine?”',
      value: 'Cinci răspunsuri care mută evaluarea treptat dinspre adult către copil.',
      context: 'Copilul întreabă continuu dacă este bine. Părintele nu retrage încurajarea, ci îl ajută să își observe obiectivul, criteriile și propria decizie.',
      coverBody: '5 răspunsuri care mută treptat evaluarea înapoi la copil.',
      steps: [
        ['Întreabă ce a urmărit.', '„Cum voiai să arate?” îl ajută să-și amintească propriul obiectiv.'],
        ['Cere-i să verifice.', '„Ce ai putea privi ca să îți dai seama?”'],
        ['Folosește criterii concrete.', '„Trebuia să fie stabil. Ce se întâmplă dacă îl miști puțin?”'],
        ['Descrie fără să judeci.', '„Ai folosit trei culori” oferă informație fără verdictul „bine” sau „rău”.'],
        ['Întoarce decizia către el.', '„Pentru tine este terminat sau mai vrei să schimbi ceva?”']
      ],
      final: 'Nu retragem încurajarea. Îl ajutăm să-și construiască propriile repere.',
      caption: 'Uneori, „E bine?” înseamnă mai mult decât o întrebare despre rezultat. 💛\n\nCum îl ajuți să aibă încredere și în propriile repere?'
    },
    {
      number: 16,
      hook: 'Joaca s-a terminat, dar strânsul nu începe?',
      value: 'Șase intervenții care transformă strânsul într-o tranziție previzibilă și realizabilă.',
      context: 'Copilul nu vrea să strângă după joacă. Încheierea este pregătită, împărțită în responsabilități precise și tratată ca ultimul pas al activității.',
      coverBody: '6 moduri prin care încheierea devine parte din activitate.',
      steps: [
        ['Anunță tranziția.', '„Mai avem cinci minute” îi oferă timp să încheie ceea ce face.'],
        ['Definește clar finalul.', '„Joaca se termină când materialele sunt din nou la locul lor.”'],
        ['Dă-i o responsabilitate precisă.', '„Tu strângi piesele roșii” este mai ușor decât „Strânge tot.”'],
        ['Începeți împreună.', 'Primele obiecte puse la loc reduc senzația unei sarcini prea mari.'],
        ['Folosește un reper vizibil.', 'O fotografie a raftului arată unde aparține fiecare lucru.'],
        ['Încheie înainte de epuizare.', 'Un copil deja obosit va percepe strânsul ca pe o provocare mult mai mare.']
      ],
      final: 'Strânsul nu este pedeapsa de după joacă. Este ultimul pas al ei.',
      caption: 'Uneori, partea cea mai grea a jocului este momentul în care trebuie să se termine. 🧸\n\nCum faceți trecerea de la joacă la strâns mai ușoară?'
    },
    {
      number: 17,
      hook: 'Ia obiectul fără să aștepte?',
      value: 'Cinci intervenții scurte care transformă „așteaptă” într-o abilitate exersată concret.',
      context: 'Copilul îl întrerupe pe celălalt și îi ia materialele. Adultul oprește calm, traduce dorința, face rândul vizibil și susține așteptarea.',
      coverBody: '5 intervenții scurte prin care exersați rândul, nu doar ascultarea.',
      steps: [
        ['Oprește acțiunea calm.', '„Nu te las să îl iei din mâna lui.”'],
        ['Tradu dorința în cuvinte.', '„Îl vrei și tu. Poți spune: «Îmi dai și mie când termini?»”'],
        ['Fă așteptarea vizibilă.', 'Folosiți un obiect de rând, o clepsidră sau o listă cu ordinea copiilor.'],
        ['Oferă ceva de făcut între timp.', 'Așteptarea devine mai posibilă când nu înseamnă doar să stea și să privească.'],
        ['Observă momentul reușit.', '„Ai așteptat până ți l-a oferit. Așa ați putut continua amândoi.”']
      ],
      final: '„Așteaptă!” este o cerință. Așteptarea propriu-zisă este o abilitate de exersat.',
      caption: 'Uneori, „așteaptă” cere o abilitate pe care copilul încă nu o poate vedea. ⏳\n\nCum faci rândul mai ușor de înțeles și de trăit?'
    },
    {
      number: 18,
      hook: 'Nu a ieșit cum avea în minte?',
      value: 'Cinci pași prin care dezamăgirea poate deschide o nouă încercare, fără repararea adultului.',
      context: 'Copilul se supără când rezultatul nu iese cum și-a imaginat. Adultul recunoaște diferența și îl ajută să aleagă ce poate face cu rezultatul imperfect.',
      coverBody: '5 pași prin care frustrarea poate deveni o nouă încercare.',
      steps: [
        ['Recunoaște diferența.', '„În mintea ta arăta altfel, iar acum ești dezamăgit.”'],
        ['Nu repara imediat.', 'Disconfortul nu înseamnă automat că adultul trebuie să preia sarcina.'],
        ['Compară intenția cu rezultatul.', '„Ce parte a ieșit cum voiai și ce parte este diferită?”'],
        ['Alege o singură modificare.', 'O intervenție precisă este mai ușoară decât refacerea întregii lucrări.'],
        ['Păstrează și variantele nereușite.', 'Ele îi arată că rezultatul final s-a construit prin încercări, nu a apărut direct.']
      ],
      final: 'Nu urmărim să-i placă orice rezultat. Îl învățăm ce poate face cu unul imperfect.',
      caption: 'Uneori, distanța dintre ce și-a imaginat și ce a ieșit pare uriașă. 💛\n\nCum îl ajuți să vadă în dezamăgire încă o posibilitate?'
    },
    {
      number: 19,
      hook: 'Te cheamă să rezolvi fiecare conflict?',
      value: 'Trei întrebări care îl ajută să formuleze faptele, nevoia și cererea înaintea soluției adultului.',
      context: 'Copilul cheamă imediat adultul când apare un conflict. În absența pericolului, adultul mediază prin trei întrebări fără să decidă imediat cine are dreptate.',
      coverBody: '3 întrebări înainte ca adultul să decidă cine are dreptate.',
      steps: [
        ['Ce s-a întâmplat?', 'Cere fapte observabile, fără etichete precum „rău”, „obraznic” sau „mereu”.'],
        ['Ce ai vrut să se întâmple?', 'Copilul învață să exprime nevoia ascunsă în spatele reacției.'],
        ['Ce i-ai putea spune acum?', 'Ajută-l să formuleze o cerere înainte să oferi tu soluția.']
      ],
      final: 'Intervenim direct când există pericol. În rest, mediem fără să confiscăm conflictul.',
      caption: 'Uneori, copilul te cheamă nu doar pentru dreptate, ci pentru că încă nu găsește cuvintele. 💛\n\nCum îl ajuți să intre singur în conversația dificilă?'
    },
    {
      number: 20,
      hook: 'O greșeală devine imediat „Nu sunt bun”?',
      value: 'Cinci răspunsuri care separă un rezultat dificil de identitatea copilului.',
      context: 'După o greșeală, copilul spune „Sunt prost” sau „Nu sunt bun”. Adultul nu acoperă verdictul cu laudă, ci îl transformă într-o problemă concretă și analizabilă.',
      coverBody: '5 răspunsuri care separă ceea ce s-a întâmplat de identitatea copilului.',
      steps: [
        ['Nu contrazice automat.', '„Ba ești foarte deștept!” poate închide conversația fără să atingă ce a simțit.'],
        ['Numește momentul concret.', '„Exercițiul acesta nu ți-a ieșit așa cum voiai.”'],
        ['Separă persoana de rezultat.', 'A greșit ceva; greșeala nu spune cine este.'],
        ['Caută locul exact al blocajului.', '„La ce pas a devenit dificil?” transformă verdictul într-o problemă analizabilă.'],
        ['Încheie cu o opțiune reală.', '„Vrei să mai încerci, să cerem un indiciu sau să facem o pauză?”']
      ],
      final: 'Când copilul spune „Nu sunt bun”, are nevoie de mai mult decât o laudă.',
      caption: 'Uneori, o singură greșeală ajunge să sune, pentru copil, ca o definiție despre sine. 💛\n\nCum îl ajuți să separe ce s-a întâmplat de cine este?'
    }
  ];

  function ideasView() {
    const ideaBranches = [
      ['prepared', 'Carduri pregătite pentru generare', 'Deschizi structuri aprobate, cu text, concluzie și caption deja stabilite.'],
      ['problem', 'O problemă pe care părintele o recunoaște', 'Pornim de la un moment real și îl transformăm într-o idee utilă, fără să vindem din prima.'],
      ['perspective', 'O perspectivă nouă asupra jocului', 'Găsim un unghi surprinzător, dar simplu și relevant pentru viața de familie.'],
      ['experience', 'Ce se întâmplă concret la Becky', 'Arătăm clar ce face copilul și de ce experiența contează pentru părinte.']
    ];
    const suggestions = {
      prepared: preparedCarouselPosts.map(post => ({ hook: `${post.number}. ${post.hook}`, value: post.value, context: post.context })),
      problem: [
        { hook: 'Cere ajutor înainte să încerce singur?', value: 'Un traseu de răspunsuri concrete prin care părintele îl ajută să pornească, apoi crește sprijinul numai dacă blocajul rămâne.', context: 'Copilul cere ajutor înainte să încerce o activitate care pare dificilă. Postarea trebuie să răspundă exact acelui moment: părintele confirmă că este disponibil, cere primul pas, restrânge alegerile, apoi oferă indiciul minim necesar. Cererea de ajutor rămâne acceptată; adultul nu refuză și nu preia automat rezolvarea.' },
        { hook: '„M-am plictisit” poate fi începutul jocului.', value: 'Reîncadrează o situație familiară și arată de ce nu trebuie să umplem imediat fiecare moment liber.', context: 'Când copilul spune că s-a plictisit, primul impuls al adultului este adesea să îi ofere imediat o activitate. Totuși, un interval scurt fără soluție gata pregătită îi poate da spațiu să observe, să inventeze și să aleagă singur. Plictiseala tolerabilă poate deveni pragul dintre consum pasiv și joacă imaginativă.' },
        { hook: 'De ce renunță când nu îi iese din prima?', value: 'Un carousel despre greșeală ca parte firească a învățării, fără morală sau presiune.', context: 'Copiii pot renunța repede când rezultatul nu seamănă cu ce și-au imaginat. În joaca deschisă, greșeala nu este o notă proastă, ci informație pentru următoarea încercare. Când procesul este valorizat mai mult decât produsul perfect, copilul își exersează răbdarea, flexibilitatea și curajul de a continua.' },
        { hook: 'Se enervează când îl corectezi?', value: 'Cinci intervenții în ordine: conectare, limbaj neutru, permisiune, o singură observație și repararea lăsată copilului.', context: 'Copilul se enervează sau intră în defensivă atunci când adultul îl corectează. Postarea arată cum părintele poate corecta fără să transforme greșeala într-un verdict despre copil: se conectează cu intenția lui, vorbește despre rezultat, cere permisiunea să intervină, limitează corectarea la un singur lucru și îl lasă pe copil să facă modificarea.' }
      ],
      perspective: [
        { hook: 'Repetiția nu înseamnă că stagnează.', value: 'Explică de ce copiii aleg aceeași activitate iar și iar și ce construiesc prin repetiție.', context: 'Copiii repetă adesea același joc nu pentru că au rămas fără idei, ci pentru că își consolidează o abilitate. La fiecare reluare schimbă ceva mic, anticipează mai bine și capătă control. Repetiția aleasă de copil poate construi competență, siguranță și apoi curajul de a încerca o variație nouă.' },
        { hook: 'Joaca liberă nu înseamnă joacă fără sens.', value: 'Leagă libertatea de alegere de planificare, negociere și rezolvarea problemelor.', context: 'Din exterior, joaca liberă poate părea lipsită de obiectiv. În realitate, copilul alege o direcție, schimbă reguli, negociază roluri și repară idei care nu funcționează. Tocmai libertatea de a decide face loc inițiativei, creativității și rezolvării autentice de probleme.' },
        { hook: 'Prezența părintelui nu trebuie să conducă jocul.', value: 'O idee matură despre conexiune: participare și atenție fără control permanent.', context: 'Conexiunea nu cere ca părintele să organizeze fiecare minut al jocului. Uneori este suficient să observe, să răspundă și să intre în povestea propusă de copil. Când adultul urmează inițiativa copilului fără să preia jocul, acesta se simte văzut și capătă mai multă încredere în propriile idei.' }
      ],
      experience: [
        { hook: 'De ce lăsăm loc și jocului neghidat?', value: 'Arată că Becky oferă libertate cu intenție, nu doar un spațiu în care copiii sunt lăsați singuri.', context: 'La Becky, momentele de joacă liberă nu sunt timp gol. Spațiul și materialele sunt alese ca să invite explorarea, iar adultul observă și intervine doar când sprijinul aduce valoare. Copilul păstrează inițiativa, dar are în jur repere, siguranță și oportunități reale de descoperire.' },
        { hook: 'O activitate bună nu are un singur rezultat corect.', value: 'Explică părinților de ce materialele deschise susțin idei diferite și încrederea copilului.', context: 'Activitățile cu un singur rezultat îi cer copilului să reproducă un model. Materialele deschise îi permit să aleagă, să combine și să schimbe direcția pe parcurs. La Becky ne interesează nu doar ce produce copilul, ci felul în care gândește, încearcă și își explică propriile alegeri.' },
        { hook: 'Ce face un spațiu de joacă să devină experiență?', value: 'Diferențiază Becky prin echilibrul dintre ambient, relație și oportunități de explorare.', context: 'O experiență valoroasă nu este dată doar de numărul de jucării. Contează cum este organizat spațiul, ce fel de interacțiuni încurajează și câtă autonomie simte copilul. La Becky urmărim un echilibru între explorare, conectare și momente ghidate care apar firesc, nu forțat.' }
      ]
    };
    const selectedBranch = ideaBranches.find(([key]) => key === state.ideaBranch);
    if (selectedBranch) {
      return `<main class="cc-os-page"><button type="button" class="cc-detail-back" data-cc-ideas-back>← Schimbă perspectiva</button><header class="cc-page-intro"><div><small>${suggestions[state.ideaBranch].length} IDEI PREGĂTITE</small><h2>${safe(selectedBranch[1])}</h2><p>Alege una. Construim imediat situația, pașii legați și CTA-ul — fără să mai scrii tu brief-ul.</p></div></header><div class="cc-suggestion-grid">${suggestions[state.ideaBranch].map((idea, index) => `<article><small>PROPUNEREA ${index + 1}</small><h3>${safe(idea.hook)}</h3><p>${safe(idea.value)}</p><button type="button" class="cc-primary" data-cc-use-idea="${index}" data-cc-idea-context="${safe(idea.context)}">✦ Construiește carouselul</button></article>`).join('')}</div></main>`;
    }
    return `<main class="cc-os-page"><header class="cc-page-intro"><div><small>IDEI</small><h2>Ce fel de idee să-ți aduc?</h2><p>Nu trebuie să scrii nimic. Alege doar o zonă, iar Content Director îți oferă subiecte concrete și utile.</p></div></header><div class="cc-idea-grid">${ideaBranches.map(([key, title, description]) => `<button type="button" data-cc-idea-branch="${key}"><span>✦</span><strong>${title}</strong><p>${description}</p><b>Arată-mi ideile →</b></button>`).join('')}</div></main>`;
  }

  function curatedIdeaPlan(branch, index) {
    if (branch === 'prepared') {
      const post = preparedCarouselPosts[index];
      if (!post) return null;
      const slides = [
        {
          heading: post.hook,
          body: post.coverBody,
          coverPromiseAuto: false,
          postCaption: post.caption,
          artworkInstruction: 'Becky exprimă vizual situația coverului, simplu și foarte expresiv.'
        },
        ...post.steps.map(([heading, body]) => ({
          heading,
          body,
          solutionAuto: false,
          artworkInstruction: `Un singur simbol watercolor simplu și literal pentru ideea: ${heading}`
        })),
        {
          heading: post.final,
          body: '',
          preserveFinal: true,
          artworkInstruction: 'Un singur simbol watercolor simplu care încheie vizual ideea postării.'
        }
      ];
      return slides.map(slide => ({ ...slide, headingParts: semanticHeadingParts(slide.heading) }));
    }
    const plans = {
      problem: [
        ['Cere ajutor înainte să încerce singur?', ['Nu prelua imediat rezolvarea.', 'Spune-i: „Sunt aici. Arată-mi mai întâi cum ai începe.”'], ['Cere-i doar primul pas.', 'Întreabă: „Care ar putea fi primul lucru pe care îl faci?”'], ['Restrânge-i opțiunile de început.', 'Dacă încă nu știe, oferă două alegeri simple dintre care să decidă.']],
        ['„M-am plictisit” poate fi începutul jocului.', ['Nu orice pauză trebuie umplută imediat.', 'Câteva momente fără o soluție pregătită îi dau copilului timp să observe ce îl atrage.'], ['Alegerea proprie pornește imaginația.', 'Când nu primește imediat o activitate, copilul începe să combine obiecte, roluri și idei.'], ['Plictiseala tolerabilă antrenează inițiativa.', 'Spațiul liber îl ajută să treacă de la „ce să fac?” la „uite ce am inventat”.']],
        ['De ce renunță când nu îi iese din prima?', ['Rezultatul imperfect poate părea un eșec.', 'Copilul are nevoie să audă că o încercare nereușită oferă informații, nu o etichetă.'], ['Procesul merită observat, nu doar produsul.', 'Întrebările despre ce a încercat îl ajută să vadă progresul pe care rezultatul final îl ascunde.'], ['Curajul crește când greșeala este sigură.', 'În joacă, copilul poate schimba strategia și încerca din nou fără presiunea de a fi perfect.']],
        ['Se enervează când îl corectezi?', ['Conectează-te înainte să corectezi.', 'Arată-i că ai observat intenția lui, nu doar ce a ieșit greșit.'], ['Vorbește despre rezultat, nu despre copil.', '„Piesa nu se potrivește aici” este diferit de „Nu ești atent.”'], ['Cere-i permisiunea să intervii.', '„Vrei să-ți arăt ceva ce am observat?” îi reduce nevoia de a se apăra.'], ['Corectează un singur lucru.', 'Prea multe observații simultane transformă ajutorul într-o listă de eșecuri.'], ['Lasă-l să facă modificarea.', 'Indică locul problemei, dar păstrează rezolvarea în mâinile lui.']]
      ],
      perspective: [
        ['Repetiția nu înseamnă că stagnează.', ['La fiecare reluare, copilul observă altceva.', 'Aceeași activitate îi permite să compare rezultate și să înțeleagă mai bine ce produce fiecare alegere.'], ['Repetiția transformă efortul în siguranță.', 'Ceea ce ieri cerea multă concentrare devine treptat familiar și lasă loc unei provocări noi.'], ['Variațiile mici arată progresul real.', 'Un material schimbat sau o regulă nouă arată că joaca repetată evoluează odată cu el.']],
        ['Joaca liberă nu înseamnă joacă fără sens.', ['Copilul își stabilește singur obiectivul.', 'Când alege ce construiește sau ce rol joacă, exersează inițiativa și planificarea.'], ['Regulile se schimbă pe măsură ce jocul crește.', 'Adaptarea poveștii și negocierea rolurilor îi cer flexibilitate, limbaj și atenție la ceilalți.'], ['Libertatea de a decide construiește autonomie.', 'Un spațiu sigur, fără rezultat unic, îi permite să testeze idei și să repare ce nu funcționează.']],
        ['Prezența părintelui nu trebuie să conducă jocul.', ['Observă înainte să propui.', 'Câteva clipe de atenție îți arată ce încearcă deja copilul și unde te invită în poveste.'], ['Intră în jocul lui, nu îl înlocui.', 'Când urmezi ideea copilului, îi confirmi că perspectiva lui merită ascultată.'], ['Conexiunea crește din atenție, nu din control.', 'Prezența calmă îi oferă siguranță, iar inițiativa rămasă la el îi întărește încrederea.']]
      ],
      experience: [
        ['De ce lăsăm loc și jocului neghidat?', ['Libertatea este susținută de un spațiu gândit.', 'Materialele și zonele de explorare invită alegeri fără să impună un singur rezultat.'], ['Adultul observă înainte să intervină.', 'Sprijinul apare când aduce valoare, nu înainte ca un copil să aibă șansa să încerce.'], ['Inițiativa copilului rămâne în centrul experienței.', 'La Becky, siguranța și reperele există tocmai pentru ca explorarea să poată rămâne liberă.']],
        ['O activitate bună nu are un singur rezultat corect.', ['Materialele deschise lasă loc alegerilor.', 'Copilul poate combina, rearanja și transforma aceeași propunere într-o idee care îi aparține.'], ['Drumul spune mai mult decât obiectul final.', 'Felul în care încearcă, schimbă și explică o alegere ne arată cum gândește.'], ['Rezultatele diferite pot fi la fel de valoroase.', 'Când nu comparăm cu un model unic, copilul capătă curaj să își urmeze propria soluție.']],
        ['Ce face un spațiu de joacă să devină experiență?', ['Nu numărul jucăriilor creează valoarea.', 'Contează dacă spațiul invită copilul să aleagă, să combine și să exploreze în ritmul lui.'], ['Relația dă sens activității.', 'Un adult atent și alți copii transforma obiectele în conversații, colaborare și descoperire.'], ['Echilibrul face loc creșterii.', 'La Becky combinăm libertatea, siguranța și ghidajul discret pentru ca joaca să rămână autentică.']]
      ]
    };
    const selected = plans[branch]?.[index];
    if (!selected) return null;
    const [hook, ...content] = selected;
    const slides = [
      { heading: hook, body: '', artworkInstruction: 'Becky exprimă vizual ideea hook-ului, simplu și foarte expresiv.' },
      ...content.map(([heading, body], contentIndex) => ({ heading, body, artworkInstruction: ['Un simbol watercolor simplu pentru conectare și atenție.', 'Un simbol watercolor simplu care separă rezultatul de identitatea copilului.', 'O bulă de conversație watercolor care sugerează permisiunea.', 'Un singur semn watercolor evidențiat calm.', 'Un simbol watercolor simplu pentru o modificare făcută de copil.'][contentIndex % 5] })),
      { heading: 'Facem loc pentru joacă cu sens?', body: state.brandSettings.defaultCta, artworkInstruction: '' }
    ];
    return slides.map(slide => ({ ...slide, headingParts: semanticHeadingParts(slide.heading) }));
  }

  function campaignsView() {
    const campaigns = state.campaigns || [];
    return `<main class="cc-os-page"><header class="cc-page-intro cc-page-intro-actions"><div><small>CAMPANII</small><h2>Grupează postările după obiectiv.</h2><p>Campania activă însoțește draftul și versiunile pe care le creezi.</p></div><button type="button" class="cc-primary" data-cc-show-campaign-form>＋ Campanie nouă</button></header>
      <form class="cc-campaign-form is-hidden" data-cc-campaign-form><label>Numele campaniei<input name="name" required placeholder="Ex: Vara la Becky"></label><label>Obiectivul principal<input name="objective" required placeholder="Ex: Rezervări pentru atelierele din iunie"></label><label class="is-wide">Descriere scurtă<textarea name="description" placeholder="Ce postări vor face parte din campanie?"></textarea></label><div class="is-wide"><button type="submit" class="cc-primary">Creează și activează</button><button type="button" class="cc-back" data-cc-hide-campaign-form>Anulează</button></div></form>
      <div class="cc-campaign-list">${campaigns.length ? campaigns.map(campaign => `<article class="${state.activeCampaignId === campaign.id ? 'is-active' : ''}"><div><small>${state.activeCampaignId === campaign.id ? 'CAMPANIA CURENTĂ' : campaign.status === 'archived' ? 'ARHIVATĂ' : 'CAMPANIE'}</small><h3>${safe(campaign.name)}</h3><p>${safe(campaign.objective)}</p><span>${safe(campaign.description || '')} · ${groupedContentItems().filter(post => post.latest.campaignId === campaign.id).length} postări salvate</span></div><button type="button" class="${state.activeCampaignId === campaign.id ? 'cc-current-campaign' : 'cc-back'}" data-cc-activate-campaign="${safe(campaign.id)}" ${state.activeCampaignId === campaign.id ? 'disabled' : ''}>${state.activeCampaignId === campaign.id ? '✓ Activă' : 'Lucrează aici'}</button></article>`).join('') : '<div class="cc-empty-state"><strong>Nu ai campanii încă.</strong><p>Creează una ca să poți grupa ușor postările.</p></div>'}</div>
    </main>`;
  }

  function contentLibraryView() {
    const posts = groupedContentItems();
    const drafts = unsavedDrafts();
    const selectedPost = posts.find(post => post.key === state.selectedContentItemKey);
    if (selectedPost) return contentItemDetailView(selectedPost);
    return `<main class="cc-os-page"><header class="cc-page-intro"><div><small>CONȚINUT</small><h2>Postările tale.</h2><p>Aici apar doar postările pe care le-ai salvat intenționat. Backupurile automate sunt păstrate în interiorul fiecărei postări.</p></div></header>
      ${drafts.length ? `<section class="cc-library-current"><div class="cc-section-title"><div><small>NESALVATE</small><h3>Tot ce ai lăsat în lucru</h3></div><span>${drafts.length} ${drafts.length === 1 ? 'draft' : 'drafturi'}</span></div>${draftListMarkup(drafts)}</section>` : ''}
      <section class="cc-library-versions"><div class="cc-section-title"><div><small>SALVATE DE MINE</small><h3>Postări finalizate sau importante</h3></div><span>${posts.length} postări</span></div>${posts.length ? `<div class="cc-post-library">${posts.map(post => `<article><span>▦</span><div><small>POSTARE · ${safe(post.latest.campaignName)}</small><strong>${safe(post.latest.name)}</strong><p>${formatSavedDate(post.latest.savedAt)} · ${post.manual.length} ${post.manual.length === 1 ? 'versiune salvată' : 'versiuni salvate'}</p></div><button type="button" class="cc-primary" data-cc-open-content="${safe(post.key)}">Intră în postare →</button></article>`).join('')}</div>` : '<div class="cc-empty-state"><strong>Nicio postare salvată de tine încă.</strong><p>Backupurile automate sunt în siguranță, dar nu aglomerează această bibliotecă.</p></div>'}</section>
    </main>`;
  }

  function contentItemDetailView(post) {
    const tab = state.contentDetailTab === 'backup' ? 'backup' : 'manual';
    const versions = tab === 'backup' ? post.backups : post.manual;
    return `<main class="cc-os-page"><button type="button" class="cc-detail-back" data-cc-close-content>← Toate postările</button><header class="cc-page-intro cc-content-detail-head"><div><small>POSTARE · ${safe(post.latest.campaignName)}</small><h2>${safe(post.latest.name)}</h2><p>Alege versiunea intenționată sau, separat, o etapă tehnică salvată automat.</p></div><button type="button" class="cc-primary" data-cc-version-variation="${safe(post.latest.id)}">＋ Creează o variație</button></header>
      <div class="cc-version-categories" role="tablist"><button type="button" data-cc-content-detail-tab="manual" class="${tab === 'manual' ? 'is-active' : ''}"><span>◆</span><div><strong>Salvate de mine</strong><small>${post.manual.length} ${post.manual.length === 1 ? 'versiune aleasă de tine' : 'versiuni alese de tine'}</small></div></button><button type="button" data-cc-content-detail-tab="backup" class="${tab === 'backup' ? 'is-active' : ''}"><span>↻</span><div><strong>Backup automat</strong><small>${post.backups.length} ${post.backups.length === 1 ? 'etapă tehnică' : 'etape tehnice'}</small></div></button></div>
      <section class="cc-library-versions cc-detail-versions"><div class="cc-section-title"><div><small>${tab === 'manual' ? 'VERSIUNI INTENȚIONATE' : 'ISTORIC DE SIGURANȚĂ'}</small><h3>${tab === 'manual' ? 'Salvate și denumite de tine' : 'Etape create automat în timpul editării'}</h3></div></div>${versions.length ? `<div class="cc-version-library">${versions.map(version => `<article class="${version.automatic ? 'is-backup' : ''}"><span>${version.automatic ? '↻' : '◆'}</span><div><strong>${safe(version.name)}</strong><small>${formatSavedDate(version.savedAt)}</small></div><div class="cc-library-actions">${version.automatic ? '' : `<button type="button" class="cc-back" data-cc-version-variation="${safe(version.id)}">Creează variație</button>`}<button type="button" class="cc-primary" data-cc-open-version="${safe(version.id)}">${version.automatic ? 'Restaurează etapa' : 'Deschide'}</button></div></article>`).join('')}</div>` : `<div class="cc-empty-state"><strong>${tab === 'manual' ? 'Nu există alte versiuni salvate.' : 'Postarea nu are backupuri automate.'}</strong></div>`}</section>
    </main>`;
  }

  function brandView() {
    const brand = state.brandSettings;
    return `<main class="cc-os-page"><header class="cc-page-intro"><div><small>BRAND</small><h2>Cum vorbește Becky.</h2><p>Aceste reguli devin contextul implicit pentru idei, texte și CTA-uri.</p></div></header><form class="cc-brand-form" data-cc-brand-form>
      <label>Vocea brandului<textarea name="voice">${safe(brand.voice)}</textarea><small>3–5 trăsături care descriu felul în care sună brandul.</small></label>
      <label>Pentru cine vorbim<textarea name="audience">${safe(brand.audience)}</textarea></label>
      <label class="is-wide">Promisiunea Becky<textarea name="promise">${safe(brand.promise)}</textarea></label>
      <label>Cuvinte și idei pe care le folosim<textarea name="preferred">${safe(brand.preferred)}</textarea></label>
      <label>Ce evităm<textarea name="avoid">${safe(brand.avoid)}</textarea></label>
      <label class="is-wide">CTA implicit<textarea name="defaultCta">${safe(brand.defaultCta)}</textarea></label>
      <div class="is-wide cc-brand-actions"><button type="submit" class="cc-primary">Salvează vocea brandului</button><span data-cc-brand-message></span></div>
    </form><section class="cc-brand-system"><div class="cc-section-title"><div><small>SISTEM VIZUAL</small><h3>Regulile folosite automat în carousels</h3></div></div><div class="cc-brand-rule-grid"><article><small>HEADER</small><strong>DynaPuff</strong><p>Contur alb, umbră compactă și ierarhie mare.</p></article><article><small>DESCRIERI</small><strong>Quicksand</strong><p>Text scurt, clar și relevant pentru părinte.</p></article><article><small>CULORI</small><div class="cc-brand-swatches"><i></i><i></i><i></i></div><p>Teal, coral și navy rămân consecvente.</p></article><article><small>LAYOUT</small><strong>1:1 · 5 implicit</strong><p>Poți adăuga până la 5 soluții suplimentare înainte de generare.</p></article></div></section></main>`;
  }

  function architectureNav() {
    return `<nav class="cc-product-map" aria-label="Arhitectura Content Director">
      <button class="is-active" type="button"><span>01</span> Today <small>ACTIV</small></button>
      <button type="button" disabled><span>02</span> Content Board <small>URMEAZĂ</small></button>
      <button type="button" disabled><span>03</span> Asset Library <small>URMEAZĂ</small></button>
      <button type="button" disabled><span>04</span> Brand Brain <small>URMEAZĂ</small></button>
      <button type="button" disabled><span>05</span> Learnings <small>URMEAZĂ</small></button>
      <button type="button" disabled><span>06</span> AI Usage <small>URMEAZĂ</small></button>
    </nav>`;
  }

  function statusStrip() {
    return `<div class="cc-status-strip">
      <div><span>POSTARE</span><strong>${state.step >= 4 ? 'Draft editabil' : 'Context'}</strong></div><i></i>
      <div><span>FORMAT IMPLICIT</span><strong class="cc-muted-status">Carousel · Story Cards · Final</strong></div><i></i>
      <div><span>CAMPANIE</span><strong>${safe(activeCampaign()?.name || 'Fără campanie')}</strong></div>
      ${state.contentItemId ? '<button type="button" class="cc-status-abandon" data-cc-abandon-idea>Abandonează ideea</button>' : ''}
    </div>`;
  }

  function contextStep() {
    return `<section class="cc-focus-card cc-simple-context ${copyDraftBusy ? 'is-building-copy' : ''}">
      <div class="cc-card-kicker">POSTARE NOUĂ</div>
      <h2>Despre ce vrei<br><em>să vorbim?</em></h2>
      <p>Pune aici ideea, notițele sau research-ul. Noi îl transformăm direct într-un carousel de awareness, în vocea Becky.</p>
      <label class="cc-context-field">Ideea sau informația de la care pornim
        <textarea data-cc-context maxlength="12000" placeholder="Ex: Jocurile cooperative pot influența felul în care copiii împart…">${safe(state.context)}</textarea>
      </label>
      <div class="cc-awareness-default"><span>✓</span><div><strong>Direcția este deja stabilită</strong><p>Informație utilă pentru părinți, prezentată matur și atractiv, care leagă Becky de joacă, dezvoltare și conexiune.</p></div></div>
      ${copyDraftError ? `<p class="cc-generation-error">${safe(copyDraftError)}</p>` : ''}
      <div class="cc-card-actions"><span>Carousel 1:1 · Story Cards · calitate finală</span><button class="cc-primary" type="button" data-cc-build-draft ${copyDraftBusy ? 'disabled' : ''}>${copyDraftBusy ? '✦ Construiesc structura…' : 'Construiește draftul →'}</button></div>
      ${copyDraftBusy ? '<div class="cc-copy-building"><i></i><strong>Transform informația într-un traseu clar.</strong><small>O situație precisă, 3 pași legați și un CTA firesc.</small></div>' : ''}
    </section>`;
  }

  function directionStep() {
    const directionOptions = availableAngles();
    const selected = angleFor(state.angle);
    return `<section class="cc-focus-card">
      <div class="cc-card-kicker">PASUL 2 · DIRECȚIA MESAJULUI</div>
      <h2>Ce vrei să spună<br><em>postarea aceasta?</em></h2>
      <p>Acestea sunt puncte de pornire, nu răspunsuri fixe. Poți alege, edita sau construi o direcție nouă după criteriile tale.</p>
      <div class="cc-recommendations">${Object.entries(directionOptions).map(([key, item], index) => { const current = angleFor(key); return `<button type="button" data-cc-angle="${key}" class="${state.angle === key ? 'is-selected' : ''}"><span class="cc-letter">${current.letter || String.fromCharCode(65 + index)}</span><div><small>${current.short || 'Direcție de mesaj'}${index === 0 && !state.customAngles?.length ? ' · PUNCT DE PORNIRE' : ''}</small><strong>${current.label}</strong><p>${current.reason}</p></div><b>${state.angle === key ? '✓' : '→'}</b></button>`; }).join('')}</div>
      ${selected ? `<div class="cc-direction-editor"><div class="cc-choice-label">EDITEAZĂ DIRECȚIA ALEASĂ</div><div class="cc-direction-fields"><label>Nume scurt<input data-cc-angle-field="label" data-cc-angle-key="${state.angle}" value="${safe(selected.label)}"></label><label>Clasificare<input data-cc-angle-field="short" data-cc-angle-key="${state.angle}" value="${safe(selected.short || '')}"></label><label class="cc-direction-wide">Ce trebuie să transmită<textarea data-cc-angle-field="reason" data-cc-angle-key="${state.angle}">${safe(selected.reason)}</textarea></label><label class="cc-direction-wide">Hook posibil<input data-cc-angle-field="hook" data-cc-angle-key="${state.angle}" value="${safe(selected.hook || '')}"></label></div></div>` : ''}
      <div class="cc-new-direction"><div class="cc-choice-label">NU GĂSEȘTI DIRECȚIA POTRIVITĂ?</div><p>Scrie criteriile: de exemplu „mai educațională, fără frică, pentru părinți care nu cunosc Becky”.</p><textarea data-cc-direction-criteria placeholder="Ce vrei să fie diferit la următoarele direcții?">${safe(state.directionCriteria || '')}</textarea><button type="button" class="cc-secondary-action" data-cc-new-direction>✦ Generează 3 direcții de lucru</button></div>
      <div class="cc-card-actions"><button class="cc-back" type="button" data-cc-back>← Context</button><button class="cc-primary" type="button" data-cc-next ${state.angle ? '' : 'disabled'}>Continuă cu direcția →</button></div>
    </section>`;
  }

  function formatStep() {
    const angle = angleFor(state.angle);
    return `<section class="cc-focus-card">
      <div class="cc-card-kicker">PASUL 3 · CREATIVE DIRECTION</div>
      <h2>Direcția e clară.<br><em>Cum o executăm?</em></h2>
      <div class="cc-selected-angle"><span>${angle.letter}</span><div><small>UNGHI ALES</small><strong>${angle.label}</strong><p>Hook propus: „${angle.hook}”</p></div></div>
      <div class="cc-choice-label">FORMAT DE TEST</div>
      <div class="cc-format-grid">${Object.entries(formats).map(([key, item]) => `<button type="button" data-cc-format="${key}" class="${state.format === key ? 'is-selected' : ''}"><span>${key === 'hybrid' ? '▶' : key === 'carousel' ? '▦' : '◫'}</span><strong>${item.label}</strong><small>${item.detail}</small></button>`).join('')}</div>
      ${state.format ? (() => { const selectedFormat = formats[state.format]; return `<div class="cc-format-explanation"><div><small>ALEGE-O CÂND</small><p>${selectedFormat.when}</p></div><div><small>CE FACI TU</small><p>${selectedFormat.you}</p></div><div><small>CE FACE AI-UL</small><p>${selectedFormat.ai}</p></div></div>`; })() : ''}
      ${state.format === 'carousel' ? (() => { const selected = carouselVariantGuidance[state.carouselVariant] || carouselVariantGuidance['story-cards']; return `<div class="cc-carousel-options"><div class="cc-choice-label">Alege direcția vizuală a carouselului</div><p class="cc-variant-intro">Alege după rolul postării, nu după nume. Toate au 5 slide-uri și folosesc aceleași reguli de brand; diferă ritmul, cantitatea de text și rolul ilustrațiilor.</p><div class="cc-carousel-variants">${Object.entries(carouselVariants).map(([key, item]) => { const guide = carouselVariantGuidance[key]; return `<button type="button" data-cc-carousel-variant="${key}" class="${state.carouselVariant === key ? 'is-selected' : ''}"><strong>${item.label}</strong><small>${item.detail}</small><span>${item.slides.length} slide-uri</span></button>`; }).join('')}</div><div class="cc-variant-explanation"><div><small>ALEGE-O CÂND</small><p>${selected.when}</p></div><div><small>CUM VA ARĂTA</small><p>${selected.looks}</p></div><div><small>ROLUL LUI BECKY</small><p>${selected.character}</p></div></div><div class="cc-variant-recommendation"><small>RECOMANDAREA PENTRU POSTAREA TA</small><strong>Story cards</strong><p>Pentru idei clare, autonome și ilustrații simple, Story cards este punctul de pornire cel mai potrivit.</p></div></div>`; })() : ''}
      <div class="cc-card-actions"><button class="cc-back" type="button" data-cc-back>← Direcții</button><button class="cc-primary" type="button" data-cc-next ${state.format ? '' : 'disabled'}>Construiește brief-ul →</button></div>
    </section>`;
  }

  function carouselPlan() {
    const angle = angleFor(state.angle);
    const objective = objectives[state.objective];
    const variant = carouselVariants[state.carouselVariant] || carouselVariants['story-cards'];
    const standaloneMessages = {
      problem: [
        { heading: angle.hook, body: '' },
        { heading: 'Când nu îi iese, are nevoie să mai încerce.', headingLines: ['Când nu îi iese,', 'are nevoie să mai încerce.'], body: 'Joaca fără presiune îi oferă copilului spațiu să capete încredere.' },
        { heading: 'Greșelile mici construiesc curaj.', headingLines: ['Greșelile mici', 'construiesc curaj.'], body: 'Într-un mediu sigur, copilul poate testa idei fără teama că trebuie să fie perfect.' },
        { heading: 'Fiecare copil descoperă în ritmul lui.', headingLines: ['Fiecare copil descoperă', 'în ritmul lui.'], body: 'Primește libertate de explorare și sprijin exact atunci când are nevoie.' },
        { heading: 'Vrei o experiență care îi dă încredere?', headingLines: ['Vrei o experiență', 'care îi dă încredere?'], body: objective.cta }
      ],
      explain: [
        { heading: angle.hook, body: '' },
        { heading: 'Copilul tău învață prin joacă.', headingLines: ['Copilul tău învață', 'prin joacă.'], body: 'Activitățile îi antrenează curiozitatea, încrederea și dorința de a explora.' },
        { heading: 'Joaca devine timp de conectare.', headingLines: ['Joaca devine timp', 'de conectare.'], body: 'Explorați împreună, fără grabă și fără presiunea de a face totul perfect.' },
        { heading: 'Fiecare copil descoperă în ritmul lui.', headingLines: ['Fiecare copil descoperă', 'în ritmul lui.'], body: 'Un spațiu cald îi oferă libertate de explorare și sprijin când are nevoie.' },
        { heading: 'Vrei o experiență care vă apropie?', headingLines: ['Vrei o experiență', 'care vă apropie?'], body: objective.cta }
      ],
      emotional: [
        { heading: angle.hook, body: '' },
        { heading: 'Atenția ta devine amintirea lui.', headingLines: ['Atenția ta devine', 'amintirea lui.'], body: 'Când vă jucați împreună, copilul simte că timpul lui contează.' },
        { heading: 'Joaca vă ajută să vă regăsiți.', headingLines: ['Joaca vă ajută', 'să vă regăsiți.'], body: 'Mai puține distrageri, mai multă prezență și conversații care vin natural.' },
        { heading: 'Momentele simple vă apropie.', headingLines: ['Momentele simple', 'vă apropie.'], body: 'Nu trebuie să iasă perfect ca să devină timp de calitate pentru amândoi.' },
        { heading: 'Facem loc pentru timp împreună?', headingLines: ['Facem loc pentru', 'timp împreună?'], body: objective.cta }
      ]
    };
    const messages = standaloneMessages[state.angle] || standaloneMessages.explain;
    const titles = carouselSlideTitles();
    const solutionHeadingCounts = state.carouselSlides.slice(1, -1).reduce((counts, slide) => {
      const key = normalizedCopy(slide?.heading);
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
      return counts;
    }, new Map());
    const expectedSolutions = Array.from({ length: Math.max(0, titles.length - 2) }, (_, index) => suggestedSolution(index));
    const missingSolutions = expectedSolutions.filter(solution => !solutionHeadingCounts.has(normalizedCopy(solution.heading)));
    const duplicateOccurrences = new Map();
    return titles.map((title, index) => {
      const storedCustom = state.carouselSlides[index] || {};
      const custom = {
        ...storedCustom,
        heading: cleanCarouselText(storedCustom.heading),
        body: cleanCarouselText(storedCustom.body),
        headingParts: Array.isArray(storedCustom.headingParts)
          ? storedCustom.headingParts.map(part => ({ ...part, text: cleanCarouselText(part?.text) }))
          : storedCustom.headingParts
      };
      const message = messages[index] || {};
      const curatedCover = index === 0 && Array.isArray(state.selectedIdeaPlan) ? state.selectedIdeaPlan[0] : null;
      const automaticCta = index === titles.length - 1 && custom.ctaInsightAuto !== false ? beckyCta() : null;
      const headingKey = normalizedCopy(custom.heading);
      const duplicateCount = solutionHeadingCounts.get(headingKey) || 0;
      const duplicateOccurrence = duplicateCount > 1 ? (duplicateOccurrences.get(headingKey) || 0) : 0;
      if (duplicateCount > 1) duplicateOccurrences.set(headingKey, duplicateOccurrence + 1);
      const repairedDuplicate = duplicateCount > 1 && duplicateOccurrence > 0 ? missingSolutions.shift() || suggestedSolution(index - 1) : null;
      const automaticSolution = index > 0 && index < titles.length - 1
        ? repairedDuplicate || (custom.solutionAuto !== false && !solutionIsPractical(custom.heading) ? suggestedSolution(index - 1) : null)
        : null;
      const coverCandidate = custom.heading || curatedCover?.heading || message.heading || title;
      const alignedCover = strategyAlignedHook(coverCandidate);
      const coverNeedsRepair = normalizedCopy(alignedCover) !== normalizedCopy(coverCandidate);
      const effectiveHeading = automaticCta?.heading || automaticSolution?.heading || (index === 0 && (custom.coverHookAuto !== false || coverNeedsRepair)
        ? alignedCover
        : index === 0 && custom.heading && !coverHookIsStrong(custom.heading) && curatedCover?.heading
        ? curatedCover.heading
        : custom.heading);
      const effectiveHeadingParts = effectiveHeading === custom.heading ? custom.headingParts : curatedCover?.headingParts;
      return {
      title,
      heading: effectiveHeading || message.heading || title,
      headingLines: effectiveHeading ? null : message.headingLines || null,
      headingCustomized: Boolean(effectiveHeading),
      headingParts: Array.isArray(effectiveHeadingParts) && effectiveHeadingParts.length >= 2
        ? effectiveHeadingParts
        : semanticHeadingParts(effectiveHeading || message.heading || title, effectiveHeadingParts),
      body: automaticCta?.body || automaticSolution?.body || (index === 0 && custom.coverPromiseAuto !== false
        ? coverPromise(titles.length - 2)
        : custom.body ?? message.body ?? state.context),
      copy: effectiveHeading || message.heading || state.context,
      role: index === 0 ? 'cover' : index === titles.length - 1 ? 'cta' : 'content',
      solutionNumber: index > 0 && index < titles.length - 1 ? index : 0,
      change: custom.change || automaticCta?.artworkInstruction || '',
      assistantInstruction: custom.assistantInstruction || '',
      ctaVariant: Math.max(0, Math.min(7, Number(custom.ctaVariant) || 0)),
      layout: custom.layout || {}
    };
    });
  }

  function artworkPrompt(slide) {
    const variant = carouselVariants[state.carouselVariant] || carouselVariants['story-cards'];
    if (slide.role === 'cover') {
      return `Create a highly expressive, premium watercolor character illustration for the COVER of a square Becky’s Garden carousel. Feature Becky, a charming cheerful yellow duckling mascot with big expressive eyes, a small orange beak and a delicate flower crown. Theme and rhetorical hook: “${slide.heading}”. She is overflowing with ideas, imagination, curiosity and happy excitement. Render the COMPLETE character artwork, including the entire lower torso/body that belongs to the pose. CRITICAL: no part of Becky may touch or be cropped by any edge of the generated image; leave at least 12 percent clean white margin around the complete artwork on every side. Do not create a flat horizontal cut through the body, feathers, wings or flower crown. The app will position the complete artwork and crop it only at the bottom edge of the final carousel card. ONE ISOLATED CHARACTER ONLY. Do not add any floating decorative marks around her: no stars, sparkles, hearts, exclamation marks, question marks, light bulbs, strokes, confetti, flowers detached from the crown or background accents. Keep all white space perfectly empty outside the character. Pure uniform white background. No text, letters, logo, clouds, pagination, frame, square panel, room, scene, collage, photorealism, other characters or watermark. Match the Becky palette: coral #F96B76, teal #238B9A, soft yellow, pale purple and pale blue. ${slide.change ? `Requested adjustment: ${slide.change}.` : ''} Variant: ${variant.label}.`;
    }
    if (slide.role === 'cta') {
      if (slide.change) {
        return `Create exactly the isolated illustration requested below for the final CTA slide.

AUTHORITATIVE USER REQUEST: “${slide.change}”

Follow the requested subject literally. Do not replace it with a metaphor, reinterpret its meaning, or add any object, symbol, character, heart, star, sparkle, speech bubble, accent, scene, or visual detail that was not explicitly requested. The requested subject takes priority over the CTA text and over any default visual idea.

Render it as one clean, centered watercolor illustration on a perfectly uniform pure white background, with generous empty margins for automatic background removal. Use the Becky palette where the user did not specify colors: coral #F96B76, teal #238B9A, soft yellow, pale purple and pale blue. No written text, letters, numbers, logos, pagination, clouds, UI, frame, border or watermark unless the user explicitly requested them.`;
      }
      return `Create one warm, simple isolated watercolor symbol for the conversational CTA of a square Becky’s Garden carousel. The CTA asks: “${slide.heading}” and invites: “${slide.body}”. Visual direction: a speech bubble with one small heart and one spark of courage. Make it feel welcoming, social and immediately readable, with ONE central symbol and at most two tiny accents. Pure uniform white background with generous margins, prepared for automatic background removal. Palette accents only: coral #F96B76, teal #238B9A, soft yellow, pale purple and pale blue. No text, letters, numbers, logos, pagination, clouds, UI, ducks, mascots, people, scenes, collage, border or watermark.`;
    }
    const style = state.carouselVariant === 'photo-editorial'
      ? 'delicate watercolor line art with one tactile paper detail'
      : state.carouselVariant === 'playful-guide'
        ? 'playful hand-drawn line icon with one small watercolor accent'
        : 'simple expressive watercolor line icon';
    return `Create one VERY SIMPLE isolated visual symbol for a square Becky’s Garden carousel. Style reference: airy premium children’s poster, ${style}, lots of white space. Use only one visual idea for: “${slide.heading}” — “${slide.body}”. ${slide.change ? `Requested adjustment: ${slide.change}.` : ''} Palette accents only: coral #F96B76, teal #238B9A, soft yellow, pale purple and pale blue. The result must be minimal and immediately readable: one icon, one object, or at most three tiny symbolic marks. No scene, no collage, no montage, no hands doing multiple activities, no room, no detailed background, no visual storytelling with many objects. Place the isolated symbol in the center on a perfectly uniform pure white background with very generous empty margins, prepared for automatic background removal. No paper texture, backdrop, vignette, square panel, cast shadow, floor, or border. Do not render text, letters, numbers, logos, pagination, clouds, UI, ducks, mascots, people, or watermarks. Keep the same thin hand-drawn/watercolor treatment across the five-slide set. Variant: ${variant.label}.`;
  }

  function characterForSlide() { return null; }

  function coverHeadlineLines(item) {
    const coverLines = {
      problem: ['Copilul renunță repede', 'când ceva nu îi iese', 'din prima?'],
      explain: ['Ce se întâmplă,', 'concret, într-o', 'experiență Becky?'],
      emotional: ['Uneori, 30 de minute', 'împreună valorează', 'mai mult.']
    };
    return coverLines[state.angle] || [item.heading];
  }

  function headlineLinesForItem(item) {
    return headlinePartsForItem(item).map(part => part.text);
  }

  function headlinePartsForItem(item) {
    const parts = item.headingParts?.length ? item.headingParts : null;
    const lines = parts || (item.headingCustomized
      ? balancedHeadlineLines(item.heading)
      : item.role === 'cover' ? coverHeadlineLines(item) : item.headingLines || balancedHeadlineLines(item.heading));
    const editableLines = item.role === 'cover' && parts?.length === 1
      ? balancedHeadlineLines(parts[0].text).map(text => ({ text, color: parts[0].color, breakBefore: true }))
      : lines;
    if (item.role === 'cover') {
      const cleaned = editableLines.flatMap(part => {
        const text = typeof part === 'string' ? part : part.text;
        const remaining = String(text).replace(/experiența\s+Becky\??/gi, '').replace(/\s{2,}/g, ' ').trim();
        return remaining ? [{
          text: remaining,
          color: typeof part === 'string' ? 'coral' : (part.color || 'coral'),
          breakBefore: typeof part === 'string' ? true : part.breakBefore !== false
        }] : [];
      });
      return cleaned.length ? cleaned : editableLines.map(part => ({
        text: typeof part === 'string' ? part : part.text,
        color: typeof part === 'string' ? 'coral' : (part.color || 'coral'),
        breakBefore: typeof part === 'string' ? true : part.breakBefore !== false
      }));
    }
    return lines.map((part, index) => ({ text: typeof part === 'string' ? part : part.text, color: typeof part === 'string' ? (index % 2 === 0 ? 'teal' : 'coral') : part.color, breakBefore: typeof part === 'string' ? true : part.breakBefore !== false }));
  }

  function displayHeadlinePartsForItem(item) {
    const parts = headlinePartsForItem(item).map(part => ({ ...part }));
    if (item.role === 'content' && item.solutionNumber && parts.length) {
      parts[0].text = `${solutionNumberEmoji(item.solutionNumber)} ${parts[0].text}`;
    }
    return parts;
  }

  function balancedHeadlineLines(text) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    if (words.length < 4) return [words.join(' ')];
    const lineCount = text.length > 62 ? 3 : 2;
    const lines = [];
    let remaining = [...words];
    for (let lineIndex = 0; lineIndex < lineCount - 1; lineIndex += 1) {
      const remainingLines = lineCount - lineIndex;
      const targetLength = remaining.join(' ').length / remainingLines;
      let bestBreak = 1;
      let bestDistance = Infinity;
      for (let wordIndex = 1; wordIndex <= remaining.length - (remainingLines - 1); wordIndex += 1) {
        const distance = Math.abs(remaining.slice(0, wordIndex).join(' ').length - targetLength);
        if (distance < bestDistance) { bestDistance = distance; bestBreak = wordIndex; }
      }
      lines.push(remaining.splice(0, bestBreak).join(' '));
    }
    lines.push(remaining.join(' '));
    return lines;
  }

  function headlineMarkup(item) {
    return displayHeadlinePartsForItem(item).map((part, index) => `<span class="is-${part.color === 'coral' ? 'coral' : 'teal'} ${part.breakBefore === false && index ? 'is-inline' : 'is-new-line'}" data-text="${safe(part.text)}">${safe(part.text)}</span>`).join('');
  }

  function slidePreview(slide, index, plan) {
    const item = plan[index];
    const source = `data:${slide.mimeType || 'image/webp'};base64,${slide.image}`;
    const character = characterForSlide(index);
    const characterMarkup = character ? `<img class="cc-slide-character is-${character.side} is-${character.layer} ${character.wide ? 'is-wide' : ''}" src="${character.src}" alt="">` : '';
    const questions = '';
    const decorationMode = ['balanced', 'airy', 'opposite'].includes(item.layout.decorationMode) ? item.layout.decorationMode : 'balanced';
    const layoutStyle = `--cc-header-shift:${Number(item.layout.headerOffsetY) || 0}px;--cc-art-shift:${Number(item.layout.artworkOffsetY) || 0}px;--cc-decor-shift:${Number(item.layout.decorationOffsetY) || 0}px`;
    const decorations = `<div class="cc-slide-decor tone-${index} is-${decorationMode}" aria-hidden="true">${carouselAssets.decorations.map(source => `<img src="${source}" alt="">`).join('')}</div>`;
    const headingParts = headlinePartsForItem(item);
    const regenerating = slideRegeneratingIndex === index;
    const slideBusy = carouselBusy || slideAssistantBusy >= 0 || slideRegeneratingIndex >= 0;
    return `<article class="cc-generated-slide is-${item.role}">
      <div class="cc-slide-preview ${regenerating ? 'is-regenerating' : ''}" data-cc-composed-index="${index}" style="${layoutStyle}"><img class="cc-slide-header-clouds" src="${carouselAssets.headerClouds}" alt=""><div class="cc-slide-art"><img src="${source}" alt="Ilustrație generată pentru slide-ul ${index + 1}"></div>${decorations}${questions}${characterMarkup}<img class="cc-slide-clouds" src="${carouselAssets.clouds}" alt=""><span class="cc-slide-page">${index + 1}/${plan.length}</span><div class="cc-slide-copy"><strong>${headlineMarkup(item)}</strong>${item.body ? `<p>${safe(item.body)}</p>` : ''}</div>${regenerating ? '<div class="cc-slide-skeleton" role="status" aria-live="polite"><div class="cc-skeleton-spark">✦</div><strong>Refac ilustrația…</strong><span>Textul și layoutul rămân intacte.</span><i></i><small>Poți continua când este gata.</small></div>' : ''}</div>
      <div class="cc-slide-controls">${item.role === 'content' ? `<div class="cc-slide-order"><div><small>ORDINEA SOLUȚIEI</small><strong>${solutionNumberEmoji(index)} Cardul ${index} din ${plan.length - 2}</strong></div><div><button type="button" data-cc-move-card="${index}" data-cc-move-direction="-1" ${index === 1 ? 'disabled' : ''}>← Mută la stânga</button><button type="button" data-cc-move-card="${index}" data-cc-move-direction="1" ${index === plan.length - 2 ? 'disabled' : ''}>Mută la dreapta →</button></div></div>` : ''}<div class="cc-edit-tabs" role="tablist"><button type="button" class="is-active" data-cc-edit-tab="illustration">Ilustrație</button><button type="button" data-cc-edit-tab="text">Text</button><button type="button" data-cc-edit-tab="elements">Elemente</button></div><div class="cc-edit-panel" data-cc-edit-panel="illustration"><div class="cc-slide-control-group"><label>Ce vrei să reprezinte ilustrația?<textarea data-cc-slide-edit="${index}" placeholder="Ex: înlocuiește floarea cu o lupă watercolor...">${safe(item.change)}</textarea></label><button type="button" class="cc-back" data-cc-regenerate="${index}" ${slideBusy ? 'disabled' : ''}>${regenerating ? 'Refac ilustrația…' : '↻ Regenerează ilustrația'}</button></div></div><div class="cc-edit-panel is-hidden" data-cc-edit-panel="text"><label>HEADER · alege culoarea și dacă fragmentul continuă pe același rând</label><div class="cc-heading-parts">${headingParts.map((part, partIndex) => `<div><input data-cc-heading-part-text="${index}" data-cc-heading-part-index="${partIndex}" value="${safe(part.text)}"><select data-cc-heading-part-color="${index}" data-cc-heading-part-index="${partIndex}"><option value="teal" ${part.color === 'teal' ? 'selected' : ''}>Teal</option><option value="coral" ${part.color === 'coral' ? 'selected' : ''}>Coral</option></select><select data-cc-heading-part-break="${index}" data-cc-heading-part-index="${partIndex}"><option value="new" ${part.breakBefore !== false ? 'selected' : ''}>Rând nou</option><option value="inline" ${part.breakBefore === false ? 'selected' : ''}>Continuă</option></select></div>`).join('')}</div><label>DESCRIERE<textarea data-cc-slide-body="${index}" placeholder="Scrie descrierea exact cum vrei să apară...">${safe(item.body || '')}</textarea></label><button type="button" class="cc-primary" data-cc-apply-text="${index}">Aplică textul în preview</button></div><div class="cc-edit-panel is-hidden" data-cc-edit-panel="elements"><div class="cc-slide-control-group cc-slide-assistant-group"><label>Ce schimbăm în layout sau elemente?<textarea data-cc-slide-assistant="${index}" placeholder="Ex: mută ilustrația cu 30px mai jos, schimbă decorațiunile sau headerul...">${safe(item.assistantInstruction)}</textarea></label><button type="button" class="cc-primary" data-cc-apply-slide="${index}" ${slideBusy ? 'disabled' : ''}>${slideAssistantBusy === index ? 'Aplic schimbările…' : '✦ Aplică în layout'}</button></div>${slideAssistantMessage && slideAssistantBusy < 0 ? `<p class="cc-slide-assistant-status">${safe(slideAssistantMessage)}</p>` : ''}</div></div>
    </article>`;
  }

  function enforceArtworkSpacing(root) {
    root.querySelectorAll('.cc-slide-preview').forEach(preview => {
      const artwork = preview.querySelector('.cc-slide-art');
      const description = preview.querySelector('.cc-slide-copy p');
      if (!artwork || !description) return;
      const previewBox = preview.getBoundingClientRect();
      const descriptionBox = description.getBoundingClientRect();
      const artworkShift = Number.parseFloat(getComputedStyle(preview).getPropertyValue('--cc-art-shift')) || 0;
      const defaultTop = previewBox.height * .39 + artworkShift;
      const minimumTop = descriptionBox.bottom - previewBox.top + 12;
      artwork.style.top = `${Math.max(defaultTop, minimumTop)}px`;
    });
  }

  function generationStatus(plan) {
    if (DEVELOPMENT_SINGLE_IMAGE_MODE) {
      return `<div class="cc-generating" role="status" aria-live="polite"><div class="cc-generating-orbit" aria-hidden="true"><i></i><i></i><i></i><span>✦</span><b class="cc-magic-spark cc-magic-one">✦</b><b class="cc-magic-spark cc-magic-two">★</b><b class="cc-magic-spark cc-magic-three">✧</b></div><strong>Generez imaginea de test · slide 2</strong><p>Acesta este singurul apel API. Aplic apoi automat layoutul, personajul, norii și paginația.</p><div class="cc-generation-progress"><i style="width:${carouselProgress ? 100 : 12}%"></i></div><div class="cc-generation-steps"><span class="${carouselProgress ? 'is-done' : 'is-active'}">${carouselProgress ? '✓' : '2'}</span></div></div>`;
    }
    const current = Math.min(carouselTarget + 1, plan.length);
    const progress = carouselOperation === 'single' ? ((carouselTarget + .45) / plan.length) * 100 : (carouselProgress / plan.length) * 100;
    return `<div class="cc-generating" role="status" aria-live="polite"><div class="cc-generating-orbit" aria-hidden="true"><i></i><i></i><i></i><span>✦</span><b class="cc-magic-spark cc-magic-one">✦</b><b class="cc-magic-spark cc-magic-two">★</b><b class="cc-magic-spark cc-magic-three">✧</b></div><strong>${carouselOperation === 'single' ? `Refac imaginea ${current} din ${plan.length}` : `Lucrez la imaginea ${current} din ${plan.length}`}</strong><p>Generez ilustrația și aplic automat fundalul, norișorii, personajele și textele. Păstrează pagina deschisă — poate dura puțin.</p><div class="cc-generation-progress"><i style="width:${Math.max(6, progress)}%"></i></div><div class="cc-generation-steps">${plan.map((_, index) => { const done = carouselOperation === 'all' ? index < carouselProgress : index !== carouselTarget && Boolean(generatedSlides[index]); const active = index === carouselTarget; return `<span class="${done ? 'is-done' : active ? 'is-active' : ''}">${done ? '✓' : index + 1}</span>`; }).join('')}</div></div>`;
  }

  function qualityGuidance(quality) {
    return {
      low: { cost: 'cost minim', time: 'cel mai rapid', quality: 'bun pentru testarea compoziției' },
      medium: { cost: 'cost echilibrat', time: 'timp moderat', quality: 'echilibru bun între detalii și consistență' },
      high: { cost: 'cost maxim', time: 'cel mai lent', quality: 'cele mai multe detalii, cu risc mai mare de variații vizuale' }
    }[quality] || null;
  }

  function carouselVersionBar() {
    const relatedVersions = carouselVersions.filter(version => version.contentKey === currentContentKey());
    const versionOption = version => {
      const date = new Date(version.savedAt);
      const label = `${version.name} · ${date.toLocaleDateString('ro-RO')} ${date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}`;
      return `<option value="${safe(version.id)}">${safe(label)}</option>`;
    };
    const manual = relatedVersions.filter(version => !version.automatic);
    const backups = relatedVersions.filter(version => version.automatic);
    const options = `${manual.length ? `<optgroup label="Salvate de mine">${manual.map(versionOption).join('')}</optgroup>` : ''}${backups.length ? `<optgroup label="Backup automat">${backups.map(versionOption).join('')}</optgroup>` : ''}`;
    return `<div class="cc-version-bar">
      <div class="cc-version-save"><label>Denumire versiune<input data-cc-version-name placeholder="Ex: Varianta finală 1"></label><button type="button" class="cc-primary" data-cc-save-version ${versionBusy ? 'disabled' : ''}>${versionBusy ? 'Salvez exact…' : '◆ Salvează versiunea'}</button></div>
      <div class="cc-version-restore"><label>Istoricul acestei postări<select data-cc-version-select ${relatedVersions.length ? '' : 'disabled'}><option value="">${relatedVersions.length ? 'Alege o versiune sau un backup' : 'Niciun istoric salvat încă'}</option>${options}</select></label><button type="button" class="cc-back" data-cc-restore-version ${relatedVersions.length ? '' : 'disabled'}>Deschide versiunea</button></div>
      <small>Salvează textele, layoutul, CTA-ul, imaginile AI și PNG-urile finale. Regenerarea nu poate modifica această copie.</small>
      ${versionMessage ? `<p>${safe(versionMessage)}</p>` : ''}
    </div>`;
  }

  function readyToPostPanel(plan) {
    const indexes = DEVELOPMENT_SINGLE_IMAGE_MODE ? [DEVELOPMENT_GENERATED_SLIDE_INDEX] : plan.map((_, index) => index);
    const nativeShareAvailable = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    return `<section class="cc-ready-to-post">
      <header><div><small>GATA DE POSTAT</small><h3>Imaginile tale, direct la îndemână.</h3><p>Pe telefon poți trimite toate slide-urile către WhatsApp, în ordinea corectă, sau le poți distribui prin altă aplicație.</p></div>${nativeShareAvailable ? `<div class="cc-social-share-actions"><button type="button" class="cc-whatsapp-share" data-cc-share-whatsapp><span aria-hidden="true">◉</span> Trimite pe WhatsApp</button><button type="button" class="cc-primary cc-share-all" data-cc-share-all>↗ Alte opțiuni</button></div>` : ''}</header>
      ${deliveryMessage ? `<p class="cc-delivery-message">${safe(deliveryMessage)}</p>` : ''}
      <div class="cc-delivery-grid">${indexes.map(index => `<article><div class="cc-delivery-image" data-cc-delivery-index="${index}"><span>${index + 1}</span><i>Pregătesc PNG-ul…</i></div><div><strong>Slide ${index + 1} din ${plan.length}</strong><span>PNG · 1024 × 1024</span></div><div class="cc-delivery-actions">${nativeShareAvailable ? `<button type="button" data-cc-share-slide="${index}">↗ Distribuie</button>` : ''}<button type="button" data-cc-save-slide="${index}">↓ Salvează PNG</button></div></article>`).join('')}</div>
      <details class="cc-desktop-export"><summary>Opțiuni desktop</summary><button type="button" data-cc-download-all>Descarcă și arhiva ZIP</button><span>ZIP-ul este păstrat doar pentru transfer sau arhivare pe computer.</span></details>
    </section>`;
  }

  function carouselGenerationStep() {
    const plan = carouselPlan();
    const variant = carouselVariants[state.carouselVariant] || carouselVariants['story-cards'];
    const resultIndexes = DEVELOPMENT_SINGLE_IMAGE_MODE ? [DEVELOPMENT_GENERATED_SLIDE_INDEX] : plan.map((_, index) => index);
    const generationComplete = resultIndexes.every(index => Boolean(generatedSlides[index]));
    if (generationComplete && !carouselBusy) {
      return `<section class="cc-carousel-result"><header class="cc-result-head"><div><span>${DEVELOPMENT_SINGLE_IMAGE_MODE ? 'IMAGINE TEST · DEV MODE' : `CAROUSEL GENERAT · ${safe(variant.label)}`}</span><h2>Revizuiește, modifică,<br><em>apoi postează.</em></h2><p>Glisează spre dreapta pentru toate cele ${plan.length} slide-uri. Coperta, soluțiile și CTA-ul Becky folosesc reguli potrivite rolului lor.</p></div><div class="cc-result-actions"><button class="cc-back" type="button" data-cc-remove-card ${plan.length <= MIN_CAROUSEL_SLIDES || carouselBusy || versionBusy ? 'disabled' : ''}>− Scoate o soluție</button><button class="cc-secondary-action" type="button" data-cc-add-card ${plan.length >= MAX_CAROUSEL_SLIDES || carouselBusy || versionBusy ? 'disabled' : ''}>＋ Adaugă o soluție</button><button class="cc-back" type="button" data-cc-generate-all ${carouselBusy || versionBusy ? 'disabled' : ''}>↻ ${DEVELOPMENT_SINGLE_IMAGE_MODE ? 'Regenerează imaginea' : 'Regenerează tot'}</button></div></header>${carouselError ? `<p class="cc-generation-error">${safe(carouselError)}</p>` : ''}${carouselVersionBar()}<div class="cc-carousel-strip-toolbar"><div class="cc-carousel-strip-label"><strong>1–2 din ${plan.length}</strong><span>Mai există încă ${Math.max(0, plan.length - 2)} slide-uri →</span></div><div class="cc-carousel-strip-actions"><span>SLIDE TO THE RIGHT</span><button type="button" class="cc-carousel-nav" data-cc-carousel-scroll="-1" aria-label="Slide-uri anterioare">← <b>Anterior</b></button><button type="button" class="cc-carousel-nav is-next" data-cc-carousel-scroll="1" aria-label="Vezi următoarele slide-uri"><b>Următorul</b> →</button></div></div><div class="cc-carousel-viewport"><div class="cc-generated-grid ${DEVELOPMENT_SINGLE_IMAGE_MODE ? 'is-single' : ''}">${resultIndexes.map(index => slidePreview(generatedSlides[index], index, plan)).join('')}</div><div class="cc-carousel-edge-hint" aria-hidden="true">→</div></div>${readyToPostPanel(plan)}</section>`;
    }
    return `<section class="cc-carousel-ready"><article class="cc-carousel-plan"><header><span>DRAFT EDITABIL · ${plan.length} SLIDE-URI</span><h2>Verifică textele înainte<br><em>să generezi imaginile.</em></h2><p>Firul este clar: problema și promisiunea pe copertă, soluții concrete, apoi modul în care Becky le aplică.</p></header><div class="cc-plan-toolbar"><div><strong>${plan.length} slide-uri</strong><span>${plan.length - 2} soluții între cover și CTA</span></div><div><button type="button" class="cc-back" data-cc-remove-card ${plan.length <= MIN_CAROUSEL_SLIDES ? 'disabled' : ''}>− Elimină ultimul card</button><button type="button" class="cc-secondary-action" data-cc-add-card ${plan.length >= MAX_CAROUSEL_SLIDES ? 'disabled' : ''}>＋ Adaugă o soluție</button></div></div><div class="cc-plan-grid">${plan.map((slide, index) => `<article><div class="cc-plan-card-head"><b>${String(index + 1).padStart(2, '0')}</b>${slide.role === 'content' ? `<div class="cc-plan-move" aria-label="Schimbă ordinea soluției"><button type="button" data-cc-move-card="${index}" data-cc-move-direction="-1" aria-label="Mută soluția la stânga" title="Mută la stânga" ${index === 1 ? 'disabled' : ''}>←</button><button type="button" data-cc-move-card="${index}" data-cc-move-direction="1" aria-label="Mută soluția la dreapta" title="Mută la dreapta" ${index === plan.length - 2 ? 'disabled' : ''}>→</button></div>` : '<span class="cc-plan-locked">FIX</span>'}</div><small>${safe(slide.title)}</small><label>HEADER<textarea data-cc-plan-heading="${index}">${safe(slide.heading)}</textarea></label><label>DESCRIERE<textarea data-cc-plan-body="${index}">${safe(slide.body || '')}</textarea></label></article>`).join('')}</div></article><aside class="cc-generate-panel ${carouselBusy ? 'is-generating' : ''}"><div class="cc-card-kicker">${carouselBusy ? 'GENERATION IN PROGRESS' : 'GATA DE GENERARE'}</div><h3>${carouselBusy ? 'Carouselul tău se construiește acum.' : 'Totul este setat.'}</h3>${carouselBusy ? generationStatus(plan) : `<dl><div><dt>Structură</dt><dd>Problemă · ${plan.length - 2} soluții · Becky</dd></div><div><dt>Format</dt><dd>Story Cards · ${plan.length} slide-uri</dd></div><div><dt>Imagini</dt><dd>${plan.length - 1} ilustrații AI + 1 CTA</dd></div><div><dt>Calitate</dt><dd>Finală</dd></div></dl><button class="cc-primary cc-generate-button" type="button" data-cc-generate-all>✦ Confirmă textele și generează</button><button class="cc-back cc-change-direction" type="button" data-cc-context-back>← Schimbă subiectul</button>`}${carouselError ? `<p class="cc-generation-error">${safe(carouselError)}</p>` : ''}</aside></section>`;
  }

  function briefStep() {
    const angle = angleFor(state.angle);
    const format = formats[state.format];
    const objective = objectives[state.objective];
    const carousel = state.format === 'carousel';
    if (carousel) return carouselGenerationStep();
    const variant = carouselVariants[state.carouselVariant] || carouselVariants['story-cards'];
    const tasks = carousel ? [
      ['structure', 'Confirmă structura slide-urilor', `${variant.slides.length} imagini · format 1:1`],
      ['brand-locks', 'Păstrează regulile de brand', 'Culori, logo, paginație și CTA final'],
      ['slide-notes', 'Descrie modificările punctuale', 'Poți cere schimbări pentru orice imagine']
    ] : [
      ['hook', 'Înregistrează hook-ul', '8–10 sec · vertical · privire în cameră'],
      ['explanation', 'Înregistrează explicația', '10–15 sec · o singură idee, fără introducere lungă'],
      ['real-footage', 'Filmează un cadru real Becky', 'Mâini, activitate sau interacțiune · fără regie artificială']
    ];
    const slideEditor = carousel ? `<div class="cc-slide-editor"><small>MODIFICĂ UN SLIDE, DACĂ VREI</small>${variant.slides.map((title, index) => `<label><span>${String(index + 1).padStart(2, '0')} · ${title}</span><textarea data-cc-slide="${index}" placeholder="Ex: schimbă imaginea cu una mai luminoasă...">${safe(state.carouselSlides[index]?.change || '')}</textarea></label>`).join('')}</div>` : '';
    return `<section class="cc-brief-layout">
      <article class="cc-production-brief">
        <header><div><span>${carousel ? 'GENERATION BRIEF · V1' : 'PRODUCTION BRIEF · V1'}</span><h2>${format.label}</h2></div><span class="cc-ready-pill">${carousel ? 'READY TO GENERATE' : 'READY TO TEST'}</span></header>
        <div class="cc-brief-grid">
          <div><small>OBJECTIVE</small><strong>${objective.label}</strong></div>
          <div><small>CONTENT ANGLE</small><strong>${angle.label}</strong></div>
          <div class="cc-brief-wide"><small>HOOK</small><blockquote>„${angle.hook}”</blockquote></div>
          <div class="cc-brief-wide"><small>CONTEXT</small><p>${safe(state.context)}</p></div>
          ${carousel ? `<div class="cc-brief-wide"><small>BRAND LOCKS · NU SE SCHIMBĂ</small><ul><li>Paleta și tratamentul vizual Becky</li><li>Logo-ul și poziționarea lui, dacă apare</li><li>Paginația și sistemul de slide-uri</li><li>CTA-ul final, cu variații aprobate</li></ul></div>${slideEditor}` : `<div><small>HUMAN / REAL</small><ul><li>Talking head autentic</li><li>Activitate reală Becky</li><li>Interacțiune reală</li></ul></div><div><small>AI CAN CREATE</small><ul><li>Motion typography</li><li>Animație explicativă subtilă</li><li>Variante de text</li></ul></div><div class="cc-brief-wide cc-do-not"><small>DO NOT GENERATE WITH AI</small><p>Copii falși, locația sau interacțiuni părinte–copil fabricate.</p></div>`}
          <div class="cc-brief-wide"><small>CTA</small><strong>${objective.cta}</strong></div>
        </div>
      </article>
      <aside class="cc-waiting-panel">
        <div class="cc-card-kicker">WAITING FOR YOU</div>
        <h3>Astăzi ai de obținut<br>doar aceste 3 lucruri.</h3>
        <div class="cc-task-list">${tasks.map(([key, title, detail]) => `<label class="${state.tasks[key] ? 'is-done' : ''}"><input type="checkbox" data-cc-task="${key}" ${state.tasks[key] ? 'checked' : ''}><span><b>${title}</b><small>${detail}</small></span></label>`).join('')}</div>
        <div class="cc-upload-preview"><span>${carousel ? '✦' : '＋'}</span><div><strong>${carousel ? 'Image generation API' : 'Upload assets'}</strong><small>${carousel ? 'Va genera toate imaginile 1:1 după regulile aprobate.' : 'Vizibil în arhitectură · disponibil în etapa următoare'}</small></div><b>${carousel ? 'NEXT' : 'LOCKED'}</b></div>
        <button class="cc-back cc-reset" type="button" data-cc-reset>Pornește alt content item</button>
      </aside>
    </section>`;
  }

  function productArchitecture() {
    const cards = [
      ['Content workflow', 'Context → recomandare → decizie → brief', 'ACTIVE', 'active'],
      ['Content Board', 'Draft, review, approved, published', 'NEXT', 'next'],
      ['Asset Library', 'Originale, metadata, permisiuni, reutilizare', 'LOCKED', 'locked'],
      ['Brand Brain', 'Brand, audiență, business context', 'LOCKED', 'locked'],
      ['Learnings', 'Observed → inference → human approved', 'LOCKED', 'locked'],
      ['AI Usage', 'Model, tokens, cost per content item', 'LOCKED', 'locked']
    ];
    return `<section class="cc-architecture"><div class="cc-section-head"><div><span>PRODUCT MAP</span><h3>Arhitectura pe care construim</h3></div><p>Doar prima buclă este activă. Restul rămâne vizibil ca să putem evalua produsul înainte să investim în infrastructură.</p></div><div class="cc-architecture-grid">${cards.map(([title, detail, status, tone], index) => `<article class="is-${tone}"><span>0${index + 1}</span><small>${status}</small><h4>${title}</h4><p>${detail}</p></article>`).join('')}</div></section>`;
  }

  function emptyArtworkResult() {
    const emptyArtwork = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"></svg>';
    return { image: btoa(emptyArtwork), mimeType: 'image/svg+xml', model: 'becky-brand-system' };
  }

  async function requestArtwork(slide, index) {
    if (DEVELOPMENT_SINGLE_IMAGE_MODE && index !== DEVELOPMENT_GENERATED_SLIDE_INDEX) return emptyArtworkResult();
    const response = await apiFetch('/api/content/carousel/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: artworkPrompt(slide), quality: state.carouselQuality })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.image) throw new Error(result.error || 'Generarea imaginii nu a reușit.');
    return result;
  }

  async function generateCarousel() {
    const plan = carouselPlan();
    if (carouselBusy || versionBusy) return;
    if (plan.every((_, index) => Boolean(generatedSlides[index]))) {
      versionBusy = true;
      versionMessage = 'Protejez automat versiunea actuală înainte de regenerare…';
      render(true);
      try {
        await saveCarouselVersion('Backup automat înainte de regenerarea completă', { automatic: true });
        versionMessage = 'Versiunea anterioară este protejată și poate fi redeschisă oricând.';
      } catch (error) {
        versionMessage = `Backupul automat nu a reușit: ${error.message}`;
        versionBusy = false;
        render(true);
        return;
      }
      versionBusy = false;
    }
    carouselBusy = true;
    carouselOperation = 'all';
    carouselError = '';
    carouselProgress = 0;
    generatedSlides = [];
    frozenComposedSlides = [];
    const indexes = DEVELOPMENT_SINGLE_IMAGE_MODE ? [DEVELOPMENT_GENERATED_SLIDE_INDEX] : plan.map((_, index) => index);
    carouselTarget = indexes[0];
    render(true);
    try {
      for (const [position, index] of indexes.entries()) {
        carouselTarget = index;
        if (position > 0) render(true);
        generatedSlides[index] = await requestArtwork(plan[index], index);
        persistGeneratedSlides();
        carouselProgress = position + 1;
      }
    } catch (error) {
      carouselError = `${error.message} Poți relua generarea.`;
    } finally {
      carouselBusy = false;
      render(true);
    }
  }

  async function regenerateSlide(index) {
    const input = document.querySelector(`[data-cc-slide-edit="${index}"]`);
    if (input) {
      state.carouselSlides[index] = { ...(state.carouselSlides[index] || {}), change: input.value.trim() };
      save();
    }
    slideRegeneratingIndex = index;
    carouselOperation = 'single';
    carouselTarget = index;
    carouselError = '';
    versionBusy = true;
    versionMessage = `Protejez versiunea actuală înainte să regenerez slide-ul ${index + 1}…`;
    render(true);
    try {
      await saveCarouselVersion(`Backup automat · înainte de slide-ul ${index + 1}`, {
        automatic: true
      });
      versionBusy = false;
      versionMessage = `Starea anterioară a slide-ului ${index + 1} poate fi restaurată din Versiuni protejate.`;
      invalidateFrozenSlide(index);
      generatedSlides[index] = await requestArtwork(carouselPlan()[index], index);
      persistGeneratedSlides();
      save();
    }
    catch (error) { carouselError = error.message; }
    finally { versionBusy = false; slideRegeneratingIndex = -1; render(true); }
  }

  async function applySlideInstruction(index) {
    const input = document.querySelector(`[data-cc-slide-assistant="${index}"]`);
    const instruction = input?.value.trim() || '';
    if (!instruction) return input?.focus();
    const current = state.carouselSlides[index] || {};
    state.carouselSlides[index] = { ...current, assistantInstruction: instruction };
    save();
    slideAssistantBusy = index;
    slideAssistantMessage = '';
    render(true);
    try {
      const item = carouselPlan()[index];
      const response = await apiFetch('/api/content/carousel/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction,
          slide: { heading: item.heading, body: item.body, artworkInstruction: item.change, layout: item.layout, brand: state.brandSettings }
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.edit) throw new Error(result.error || 'Nu am putut aplica modificarea.');
      const edit = result.edit;
      invalidateFrozenSlide(index);
      const layout = current.layout || {};
      state.carouselSlides[index] = {
        ...current,
        assistantInstruction: instruction,
        heading: edit.heading ?? current.heading,
        body: edit.body ?? current.body,
        headingParts: edit.headingParts ?? (edit.heading ? null : current.headingParts),
        change: edit.artworkInstruction ?? current.change ?? '',
        layout: {
          headerOffsetY: (Number(layout.headerOffsetY) || 0) + (Number(edit.headerOffsetDelta) || 0),
          artworkOffsetY: (Number(layout.artworkOffsetY) || 0) + (Number(edit.artworkOffsetDelta) || 0),
          decorationOffsetY: (Number(layout.decorationOffsetY) || 0) + (Number(edit.decorationOffsetDelta) || 0),
          decorationMode: edit.decorationMode === 'keep' ? layout.decorationMode || 'balanced' : edit.decorationMode || layout.decorationMode || 'balanced'
        }
      };
      slideAssistantMessage = edit.artworkInstruction ? 'Layoutul a fost actualizat. Promptul ilustrației este pregătit; regenereaz-o doar dacă vrei și desenul nou.' : 'Textul și layoutul slide-ului au fost actualizate.';
      save();
    } catch (error) {
      slideAssistantMessage = error.message;
    } finally {
      slideAssistantBusy = -1;
      render(true);
    }
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
  }

  function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
    const visibleLines = lines.slice(0, maxLines);
    visibleLines.forEach((value, index) => {
      const final = index === maxLines - 1 && lines.length > maxLines ? `${value.replace(/[.,;:]?$/, '')}…` : value;
      context.fillText(final, x, y + index * lineHeight);
    });
    return y + Math.max(0, visibleLines.length - 1) * lineHeight + 9;
  }

  function wrappedLines(context, text, maxWidth, maxLines) {
    const words = String(text).trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
    return lines.slice(0, maxLines).map((value, index) => index === maxLines - 1 && lines.length > maxLines ? `${value.replace(/[.,;:]?$/, '')}…` : value);
  }

  function headlineSegmentLines(context, text, maxWidth, maxLines) {
    const parts = Array.isArray(text) ? text.map((value, index) => typeof value === 'string' ? { text: value, color: index % 2 === 0 ? 'teal' : 'coral', breakBefore: true } : value) : [{ text, color: 'teal', breakBefore: true }];
    const lines = [];
    parts.forEach(part => {
      const words = String(part.text || '').trim().split(/\s+/).filter(Boolean);
      words.forEach((word, wordIndex) => {
        const forceBreak = !lines.length || (part.breakBefore !== false && wordIndex === 0);
        const previous = lines[lines.length - 1];
        const candidate = previous && !forceBreak ? `${previous.map(segment => segment.text).join(' ')} ${word}` : word;
        if (!forceBreak && context.measureText(candidate).width <= maxWidth) previous.push({ text: word, color: part.color });
        else lines.push([{ text: word, color: part.color }]);
      });
    });
    return lines.slice(0, maxLines);
  }

  function measureHeadlineBottom(context, text, y, maxWidth, size = 62, maxLines = 3) {
    context.save();
    context.font = `600 ${size}px DynaPuff, sans-serif`;
    const lines = headlineSegmentLines(context, text, maxWidth, maxLines);
    context.restore();
    if (!lines.length) return y;
    // `y` is the first text baseline. Use the visible glyph bottom rather than
    // a complete extra line box, otherwise the artwork receives a fake gap.
    return y + (lines.length - 1) * (size * 1.12) + size * .22;
  }

  function drawHeadline(context, text, x, y, maxWidth, size = 62, maxLines = 3) {
    context.save();
    context.font = `600 ${size}px DynaPuff, sans-serif`;
    context.textAlign = 'left';
    context.globalAlpha = .95;
    context.lineWidth = 14;
    context.lineJoin = 'round';
    context.strokeStyle = 'rgba(255,255,255,.94)';
    const lines = headlineSegmentLines(context, text, maxWidth, maxLines);
    lines.slice(0, maxLines).forEach((segments, lineIndex) => {
      const lineY = y + lineIndex * (size * 1.12);
      const totalWidth = segments.reduce((sum, segment, index) => sum + context.measureText(segment.text).width + (index ? context.measureText(' ').width : 0), 0);
      let cursor = x - totalWidth / 2;
      segments.forEach(segment => {
        const fill = context.createLinearGradient(0, lineY - size, 0, lineY + size * .12);
        if (segment.color !== 'coral') { fill.addColorStop(0, '#26B8C0'); fill.addColorStop(.48, '#0296A0'); fill.addColorStop(1, '#007F89'); }
        else { fill.addColorStop(0, '#FF756D'); fill.addColorStop(.5, '#FA564D'); fill.addColorStop(1, '#E74742'); }
        context.shadowColor = 'rgba(35,52,73,.14)'; context.shadowOffsetY = 4; context.shadowBlur = 3;
        context.strokeText(segment.text, cursor, lineY); context.shadowColor = 'transparent'; context.fillStyle = fill; context.fillText(segment.text, cursor, lineY);
        cursor += context.measureText(segment.text).width + context.measureText(' ').width;
      });
    });
    context.restore();
    return y + Math.min(lines.length, maxLines) * (size * 1.12);
  }

  function drawImageCover(context, image, x, y, width, height) {
    const scale = Math.max(width / image.width, height / image.height);
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const sourceX = (image.width - sourceWidth) / 2;
    const sourceY = (image.height - sourceHeight) / 2;
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  }

  function drawImageContain(context, image, x, y, width, height) {
    const scale = Math.min(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function drawCarouselBackground(context) {
    const background = context.createLinearGradient(0, 0, 0, 1024);
    background.addColorStop(0, '#FFFFFF');
    background.addColorStop(.58, '#FFFEFF');
    background.addColorStop(1, '#FFFCFE');
    context.fillStyle = background;
    context.fillRect(0, 0, 1024, 1024);
    [
      [105, 255, 235, 'rgba(255,176,207,.16)', 'rgba(255,176,207,.045)'],
      [875, 300, 260, 'rgba(100,201,235,.14)', 'rgba(100,201,235,.035)'],
      [155, 690, 245, 'rgba(180,150,238,.13)', 'rgba(180,150,238,.032)'],
      [850, 735, 250, 'rgba(255,221,96,.14)', 'rgba(255,221,96,.035)']
    ].forEach(([x, y, radius, centerColor, midColor]) => {
      const splash = context.createRadialGradient(x, y, 0, x, y, radius);
      splash.addColorStop(0, centerColor);
      splash.addColorStop(.48, midColor);
      splash.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = splash;
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    });
  }

  function drawHeaderClouds(context, image) {
    const width = 1106;
    const height = width * (image.height / image.width);
    context.drawImage(image, -41, -45, width, height);
  }

  const artworkBoundsCache = new WeakMap();

  function detectArtworkBounds(artwork) {
    if (artworkBoundsCache.has(artwork)) return artworkBoundsCache.get(artwork);
    const sampleSize = 256;
    const sample = document.createElement('canvas');
    sample.width = sampleSize; sample.height = sampleSize;
    const sampleContext = sample.getContext('2d', { willReadFrequently: true });
    sampleContext.drawImage(artwork, 0, 0, sampleSize, sampleSize);
    const pixels = sampleContext.getImageData(0, 0, sampleSize, sampleSize).data;
    const cornerPoints = [[2, 2], [253, 2], [2, 253], [253, 253]];
    const background = cornerPoints.reduce((sum, [x, y]) => {
      const offset = (y * sampleSize + x) * 4;
      return sum.map((value, channel) => value + pixels[offset + channel] / cornerPoints.length);
    }, [0, 0, 0, 0]);
    let minX = sampleSize, minY = sampleSize, maxX = -1, maxY = -1;
    for (let y = 0; y < sampleSize; y += 1) {
      for (let x = 0; x < sampleSize; x += 1) {
        const offset = (y * sampleSize + x) * 4;
        const alpha = pixels[offset + 3];
        const foreground = background[3] < 32
          ? alpha > 28
          : alpha > 28 && Math.hypot(pixels[offset] - background[0], pixels[offset + 1] - background[1], pixels[offset + 2] - background[2]) > 42;
        if (!foreground) continue;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
    let bounds = { x: 0, y: 0, width: artwork.width, height: artwork.height };
    if (maxX >= minX && maxY >= minY) {
      const detectedWidth = maxX - minX + 1;
      const detectedHeight = maxY - minY + 1;
      if (detectedWidth < sampleSize * .9 || detectedHeight < sampleSize * .9) {
        const padding = Math.max(detectedWidth, detectedHeight) * .03;
        const x1 = Math.max(0, minX - padding), y1 = Math.max(0, minY - padding);
        const x2 = Math.min(sampleSize, maxX + 1 + padding), y2 = Math.min(sampleSize, maxY + 1 + padding);
        bounds = { x: x1 / sampleSize * artwork.width, y: y1 / sampleSize * artwork.height, width: (x2 - x1) / sampleSize * artwork.width, height: (y2 - y1) / sampleSize * artwork.height };
      }
    }
    artworkBoundsCache.set(artwork, bounds);
    return bounds;
  }

  function artworkPlacement(artwork, visibleTop) {
    const source = detectArtworkBounds(artwork);
    const maxWidth = 760;
    const maxHeight = Math.max(0, 858 - visibleTop);
    const scale = Math.min(maxWidth / source.width, maxHeight / source.height);
    const width = source.width * scale;
    const height = source.height * scale;
    return { source, x: (1024 - width) / 2, y: visibleTop, width, height };
  }

  function drawSoftArtwork(context, artwork, placement) {
    if (placement.width <= 0 || placement.height <= 0) return;
    context.save();
    context.globalAlpha = .9;
    context.globalCompositeOperation = 'multiply';
    context.beginPath();
    context.rect(placement.x, placement.y, placement.width, placement.height);
    context.clip();
    context.drawImage(artwork, placement.source.x, placement.source.y, placement.source.width, placement.source.height, placement.x, placement.y, placement.width, placement.height);
    context.restore();
  }

  function drawCoverArtwork(context, artwork, safeTop = 520) {
    const coverOffsetY = 16;
    const source = detectArtworkBounds(artwork);
    const target = { x: 102, y: safeTop, width: 820 };
    const fitWidthScale = target.width / source.width;
    const continuePastCanvasScale = (1060 - target.y) / source.height;
    // Size by available vertical space. Width is only a maximum, never a
    // target that zooms the mascot until only its head remains visible.
    const scale = Math.min(fitWidthScale, continuePastCanvasScale);
    const drawWidth = source.width * scale;
    const drawHeight = source.height * scale;
    // Start immediately after the protected headline gap. The source is scaled
    // to continue past the canvas bottom whenever its aspect ratio allows it.
    const drawY = target.y + coverOffsetY;
    context.save();
    context.globalAlpha = .92;
    context.globalCompositeOperation = 'multiply';
    // Clip the cover artwork below the protected text boundary. Even if an AI
    // image contains unexpected transparent/white margins, no painted pixel
    // can enter the headline or description area.
    context.beginPath();
    context.rect(0, drawY, 1024, 1024 - drawY);
    context.clip();
    context.drawImage(artwork, source.x, source.y, source.width, source.height, target.x + (target.width - drawWidth) / 2, drawY, drawWidth, drawHeight);
    context.restore();
  }

  function drawCoverLogo(context, logo) {
    const source = detectArtworkBounds(logo);
    const target = { x: 437, y: 62, width: 150, height: 120 };
    const scale = Math.min(target.width / source.width, target.height / source.height);
    const width = source.width * scale;
    const height = source.height * scale;
    context.save();
    context.globalAlpha = .98;
    context.drawImage(logo, source.x, source.y, source.width, source.height, target.x + (target.width - width) / 2, target.y + (target.height - height) / 2, width, height);
    context.restore();
  }

  function rectanglesAreClose(a, b, gap = 24) {
    return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
  }

  function drawSlideDecorations(context, images, index, layout = {}, protectedRects = []) {
    const sizes = [108, 108, 66];
    const placed = [];
    const verticalShift = Number(layout.decorationOffsetY) || 0;
    context.save();
    context.globalAlpha = .4;
    images.forEach((image, assetIndex) => {
      if (layout.decorationMode === 'airy' && assetIndex === 1) return;
      const size = sizes[assetIndex];
      const opposite = layout.decorationMode === 'opposite';
      const startRight = opposite ? index % 2 !== 0 : index % 2 === 0;
      const sideOrder = startRight ? ['right', 'left'] : ['left', 'right'];
      const candidates = [];
      for (const y of [430, 510, 590, 670, 750]) {
        sideOrder.forEach(side => candidates.push({ x: side === 'left' ? 30 : 1024 - size - 30, y: y + verticalShift, width: size, height: size }));
      }
      const placement = candidates.find(candidate => candidate.y >= 300 && candidate.y + candidate.height <= 900 && ![...protectedRects, ...placed].some(rect => rectanglesAreClose(candidate, rect)));
      if (!placement) return;
      placed.push(placement);
      context.drawImage(image, placement.x, placement.y, size, size);
    });
    context.restore();
  }

  function drawCharacter(context, image, character) {
    const centered = character.side === 'center';
    const width = centered ? 360 : character.wide ? 330 : 280;
    const height = centered ? 371 : character.wide ? 340 : 289;
    const x = centered ? (1024 - width) / 2 : character.side === 'left' ? 70 : 1024 - width - 70;
    const y = centered ? 390 : character.wide ? 450 : 420;
    context.drawImage(image, x, y, width, height);
  }

  function characterBounds(character) {
    if (!character) return null;
    const centered = character.side === 'center';
    const width = centered ? 360 : character.wide ? 330 : 280;
    const height = centered ? 371 : character.wide ? 340 : 289;
    return { x: centered ? (1024 - width) / 2 : character.side === 'left' ? 70 : 1024 - width - 70, y: centered ? 390 : character.wide ? 450 : 420, width, height };
  }

  async function composeSlide(index) {
    if (frozenComposedSlides[index]) return dataUrlToBlob(frozenComposedSlides[index]);
    const plan = carouselPlan();
    const item = plan[index];
    const slide = generatedSlides[index];
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    const context = canvas.getContext('2d');
    await Promise.race([
      Promise.all([document.fonts?.load('600 80px DynaPuff'), document.fonts?.load('700 27px Quicksand'), document.fonts?.load('600 40px Quicksand')].filter(Boolean)),
      new Promise(resolve => setTimeout(resolve, 2000))
    ]);
    const character = characterForSlide(index);
    const [artwork, clouds, headerClouds, decorationImages, logo, characterImage] = await Promise.all([
      loadImage(`data:${slide.mimeType || 'image/webp'};base64,${slide.image}`),
      loadImage(carouselAssets.clouds),
      loadImage(carouselAssets.headerClouds),
      Promise.all(carouselAssets.decorations.map(loadImage)),
      loadImage(carouselAssets.logo),
      character ? loadImage(character.src) : Promise.resolve(null)
    ]);
    const headlineText = displayHeadlinePartsForItem(item);
    const headlineY = (item.role === 'cover' ? 276 : 248) + (Number(item.layout.headerOffsetY) || 0);
    const plannedHeadlineBottom = measureHeadlineBottom(context, headlineText, headlineY, 868, item.role === 'cover' ? 79 : 74, 3);
    let plannedArtworkTop = plannedHeadlineBottom + 12;
    if (item.role === 'cover' && item.body) {
      context.save();
      context.globalAlpha = 0;
      context.font = '600 32px Quicksand, sans-serif';
      // drawWrappedText returns the last baseline. Add the visible glyph
      // depth plus a real 24px breathing zone before artwork may begin.
      plannedArtworkTop = drawWrappedText(context, item.body, 512, plannedHeadlineBottom - 14, 768, 40, 3) + 54 + Math.max(0, Number(item.layout.artworkOffsetY) || 0);
      context.restore();
    }
    drawCarouselBackground(context);
    if (item.role === 'cover') drawCoverArtwork(context, artwork, plannedArtworkTop);
    drawHeaderClouds(context, headerClouds);
    if (characterImage && character.layer === 'back') drawCharacter(context, characterImage, character);
    context.drawImage(clouds, 0, 830, 1024, 194);
    if (characterImage && character.layer === 'front') drawCharacter(context, characterImage, character);
    context.fillStyle = '#233449';
    context.globalAlpha = .85;
    context.font = '600 58px DynaPuff, sans-serif';
    context.textAlign = 'center';
    context.fillText(`${index + 1}/${plan.length}`, 870, 991);
    context.globalAlpha = 1;
    context.textAlign = 'left';
    context.textAlign = 'center';
    const headlineBottom = drawHeadline(context, headlineText, 512, headlineY, 868, item.role === 'cover' ? 79 : 74, 3);
    if (item.role === 'cover') drawCoverLogo(context, logo);
    let descriptionTop = headlineBottom;
    let descriptionBottom = headlineBottom;
    let artworkTop = headlineBottom + 12;
    if (item.body) {
      context.fillStyle = '#233449';
      context.font = '600 32px Quicksand, sans-serif';
      descriptionTop = headlineBottom - 14;
      descriptionBottom = drawWrappedText(context, item.body, 512, descriptionTop, 768, 40, 3);
      artworkTop = descriptionBottom + 12 + Math.max(0, Number(item.layout.artworkOffsetY) || 0);
    }
    const artworkBox = item.role === 'cover' ? null : artworkPlacement(artwork, artworkTop);
    const protectedRects = [
      { x: 78, y: headlineY - (item.role === 'cover' ? 79 : 74), width: 868, height: headlineBottom - headlineY + (item.role === 'cover' ? 79 : 74) },
      ...(item.body ? [{ x: 128, y: descriptionTop - 32, width: 768, height: descriptionBottom - descriptionTop + 41 }] : []),
      ...(artworkBox ? [{ x: artworkBox.x, y: artworkBox.y, width: artworkBox.width, height: artworkBox.height }] : []),
      ...(characterBounds(character) ? [characterBounds(character)] : []),
      { x: 785, y: 905, width: 170, height: 100 }
    ];
    if (item.role !== 'cover') drawSlideDecorations(context, decorationImages, index, item.layout, protectedRects);
    if (artworkBox) drawSoftArtwork(context, artwork, artworkBox);
    context.textAlign = 'left';
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }

  function crc32(bytes) {
    let crc = -1;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
    return (crc ^ -1) >>> 0;
  }

  function zipStore(files) {
    const encoder = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;
    const write16 = (view, position, value) => view.setUint16(position, value, true);
    const write32 = (view, position, value) => view.setUint32(position, value, true);
    files.forEach(file => {
      const name = encoder.encode(file.name);
      const checksum = crc32(file.bytes);
      const local = new Uint8Array(30 + name.length);
      const localView = new DataView(local.buffer);
      write32(localView, 0, 0x04034b50); write16(localView, 4, 20); write16(localView, 6, 0); write16(localView, 8, 0); write16(localView, 10, 0); write16(localView, 12, 0); write32(localView, 14, checksum); write32(localView, 18, file.bytes.length); write32(localView, 22, file.bytes.length); write16(localView, 26, name.length); write16(localView, 28, 0); local.set(name, 30);
      chunks.push(local, file.bytes);
      const entry = new Uint8Array(46 + name.length);
      const entryView = new DataView(entry.buffer);
      write32(entryView, 0, 0x02014b50); write16(entryView, 4, 20); write16(entryView, 6, 20); write16(entryView, 8, 0); write16(entryView, 10, 0); write16(entryView, 12, 0); write16(entryView, 14, 0); write32(entryView, 16, checksum); write32(entryView, 20, file.bytes.length); write32(entryView, 24, file.bytes.length); write16(entryView, 28, name.length); write16(entryView, 30, 0); write16(entryView, 32, 0); write16(entryView, 34, 0); write16(entryView, 36, 0); write32(entryView, 38, 0); write32(entryView, 42, offset); entry.set(name, 46);
      central.push(entry);
      offset += local.length + file.bytes.length;
    });
    const centralSize = central.reduce((sum, item) => sum + item.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    write32(endView, 0, 0x06054b50); write16(endView, 4, 0); write16(endView, 6, 0); write16(endView, 8, files.length); write16(endView, 10, files.length); write32(endView, 12, centralSize); write32(endView, 16, offset); write16(endView, 20, 0);
    return new Blob([...chunks, ...central, end], { type: 'application/zip' });
  }

  async function downloadCarousel() {
    const files = [];
    const indexes = DEVELOPMENT_SINGLE_IMAGE_MODE ? [DEVELOPMENT_GENERATED_SLIDE_INDEX] : generatedSlides.map((_, index) => index);
    for (const index of indexes) {
      const blob = await composeSlide(index);
      files.push({ name: `becky-carousel-${String(index + 1).padStart(2, '0')}.png`, bytes: new Uint8Array(await blob.arrayBuffer()) });
    }
    const url = URL.createObjectURL(zipStore(files));
    const link = document.createElement('a');
    link.href = url; link.download = `becky-carousel-${new Date().toISOString().slice(0, 10)}.zip`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function composedFile(index) {
    const blob = await composeSlide(index);
    return new File([blob], `becky-carousel-${String(index + 1).padStart(2, '0')}.png`, { type: 'image/png' });
  }

  function downloadFile(file) {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function shareCarousel(indexes) {
    deliveryMessage = '';
    const files = [];
    for (const index of indexes) files.push(await composedFile(index));
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files }))) {
      await navigator.share({ files, title: 'Carousel Becky' });
      return true;
    }
    deliveryMessage = 'Acest browser nu poate trimite imaginile direct către aplicații. Le poți salva individual mai jos.';
    return false;
  }

  async function renderComposedPreviews(root) {
    const compositionRevision = previewCompositionRevision;
    const targets = [...root.querySelectorAll('[data-cc-composed-index], [data-cc-delivery-index]')];
    const indexes = [...new Set(targets.map(target => Number(target.dataset.ccComposedIndex ?? target.dataset.ccDeliveryIndex)))];
    await Promise.all(indexes.map(async index => {
      if (!generatedSlides[index]) return;
      try {
        const blob = await composeSlide(index);
        if (compositionRevision !== previewCompositionRevision) return;
        targets.filter(target => Number(target.dataset.ccComposedIndex ?? target.dataset.ccDeliveryIndex) === index).forEach(target => {
          if (!target.isConnected) return;
          const source = URL.createObjectURL(blob);
          const image = document.createElement('img');
          image.className = 'cc-composed-preview';
          image.alt = `Preview final slide ${index + 1}`;
          image.onload = () => URL.revokeObjectURL(source);
          image.src = source;
          target.querySelectorAll('.cc-composed-preview').forEach(existing => existing.remove());
          target.append(image);
        });
      } catch (error) {
        console.error('Carousel preview composition failed', error);
      }
    }));
  }

  function freshCreationState(entry = 'own', branch = '') {
    const branchContext = {
      prepared: 'Folosesc un carousel pregătit și aprobat, fără rescrierea automată a textelor.',
      problem: 'Vreau o postare pornită dintr-o problemă reală pe care părinții o recunosc imediat.',
      perspective: 'Vreau o perspectivă nouă, simplă și utilă despre rolul jocului în dezvoltarea copilului.',
      experience: 'Vreau să arăt concret ce se întâmplă într-o experiență Becky și de ce contează pentru familie.',
      variation: 'Vreau o direcție nouă pentru aceeași temă, cu alt hook, alt mesaj și o expresie vizuală diferită.'
    };
    return {
      contentItemId: `content:${Date.now()}:${Math.random().toString(16).slice(2)}`,
      selectedContentItemKey: '',
      contentDetailTab: 'manual',
      step: 1,
      context: '',
      objective: defaults.objective,
      angle: 'emotional',
      angleEdits: {},
      customAngles: [],
      ideaBranch: '',
      directionCriteria: branchContext[branch] || '',
      postCaption: '',
      postCaptionAuto: true,
      postCaptionStyle: 'teaser-v1',
      format: 'carousel',
      carouselVariant: defaults.carouselVariant,
      carouselQuality: defaults.carouselQuality,
      discardedSolutionHeadings: [],
      carouselSlides: defaults.carouselSlides.map(item => ({ ...item })),
      tasks: {},
      creationEntry: entry,
      contentView: 'create'
    };
  }

  async function beginNewContent(entry = 'own', branch = '') {
    await persistCurrentDraft().catch(() => {});
    if (generatedSlides.length >= carouselSlideCount()) {
      try {
        await saveCarouselVersion('Backup automat · înainte de proiect nou', { automatic: true });
      } catch (error) {
        versionMessage = `Proiectul nou nu a fost pornit: versiunea curentă nu a putut fi protejată (${error.message}).`;
        state.contentView = 'content';
        save();
        render(true);
        return;
      }
    }
    state = { ...state, ...freshCreationState(entry, branch) };
    generatedSlides = [];
    frozenComposedSlides = [];
    carouselError = '';
    await clearPersistedGeneratedSlides();
    save();
    render();
    requestAnimationFrame(() => document.querySelector('[data-cc-context]')?.focus());
  }

  async function beginVariationFromVersion(versionId) {
    if (versionBusy) return;
    versionBusy = true;
    try {
      await restoreCarouselVersion(versionId);
      const sourceContext = state.context;
      const sourceObjective = state.objective;
      const sourceCampaignId = state.activeCampaignId;
      state = {
        ...state,
        ...freshCreationState('ideas', 'variation'),
        context: sourceContext,
        objective: sourceObjective,
        activeCampaignId: sourceCampaignId,
        directionCriteria: 'Păstrează tema, dar propune un hook nou, o perspectivă utilă diferită și o direcție artistică distinctă.',
        step: 1
      };
      generatedSlides = [];
      frozenComposedSlides = [];
      await clearPersistedGeneratedSlides();
      save();
      versionMessage = 'Originalul rămâne protejat. Lucrezi acum într-o variație nouă.';
    } catch (error) {
      versionMessage = `Variația nu a putut fi pornită: ${error.message}`;
      state.contentView = 'content';
    } finally {
      versionBusy = false;
      render();
    }
  }

  function semanticHeadingParts(heading, proposedParts = null) {
    const cleanHeading = String(heading || '').replace(/\s+/g, ' ').trim();
    const proposed = Array.isArray(proposedParts)
      ? proposedParts.map(part => String(part?.text || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
      : [];
    if (proposed.length >= 2 && normalizedCopy(proposed.join(' ')) === normalizedCopy(cleanHeading)) {
      return [
        { text: proposed[0], color: 'teal', breakBefore: true },
        { text: proposed.slice(1).join(' '), color: 'coral', breakBefore: false }
      ];
    }
    const words = cleanHeading.split(/\s+/).filter(Boolean);
    if (words.length < 2) return [{ text: cleanHeading, color: 'teal', breakBefore: true }];
    const semanticPivots = ['nu', 'când', 'cand', 'prin', 'fără', 'fara', 'înainte', 'inainte', 'singur', 'împreună', 'impreuna', 'mai', 'devine', 'construiește', 'construieste', 'transformă', 'transforma'];
    const lowerWords = words.map(word => normalizedCopy(word));
    const minimum = Math.max(1, Math.floor(words.length * .32));
    const maximum = Math.min(words.length - 1, Math.ceil(words.length * .68));
    let splitAt = lowerWords.findIndex((word, index) => index >= minimum && index <= maximum && semanticPivots.includes(word));
    if (splitAt < 1) splitAt = Math.max(1, Math.min(words.length - 1, Math.round(words.length * .5)));
    return [
      { text: words.slice(0, splitAt).join(' '), color: 'teal', breakBefore: true },
      { text: words.slice(splitAt).join(' '), color: 'coral', breakBefore: false }
    ];
  }

  function applyCarouselCopyPlan(slides, caption = '') {
    const fittedSlides = fitCarouselCopyPlan(slides, slides?.length || DEFAULT_CAROUSEL_SLIDES);
    const titles = carouselSlideTitles(fittedSlides.length);
    state.carouselSlides = fittedSlides.map((slide, index) => ({
      title: titles[index],
      heading: cleanCarouselText(slide.heading),
      body: cleanCarouselText(slide.body),
      coverPromiseAuto: index === 0 ? slide.coverPromiseAuto !== false : false,
      coverHookAuto: index === 0,
      ctaInsightAuto: index === fittedSlides.length - 1 ? slide.preserveFinal !== true : false,
      preserveFinal: index === fittedSlides.length - 1 && slide.preserveFinal === true,
      solutionAuto: index > 0 && index < fittedSlides.length - 1 ? slide.solutionAuto !== false : false,
      headingParts: semanticHeadingParts(cleanCarouselText(slide.heading), Array.isArray(slide.headingParts) ? slide.headingParts.map(part => ({ ...part, text: cleanCarouselText(part?.text) })) : slide.headingParts),
      change: cleanCarouselText(slide.artworkInstruction),
      assistantInstruction: '',
      layout: {}
    }));
    state.discardedSolutionHeadings = [];
    state.postCaption = cleanCarouselText(caption || slides?.[0]?.postCaption) || suggestedPostCaption();
    state.postCaptionAuto = true;
    state.postCaptionStyle = 'teaser-v1';
  }

  function normalizedCopy(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function cleanCarouselText(value) {
    return String(value || '')
      .replace(/\\+/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .trim();
  }

  function coverHookIsStrong(heading) {
    const hook = normalizedCopy(heading);
    if (!hook) return false;
    const genericBrandOpenings = [
      'incurajam ', 'sustinem ', 'promovam ', 'oferim ', 'ajutam ', 'dezvoltam ',
      'la becky ', 'becky incurajeaza ', 'becky sustine ', 'copiii invata ',
      'rabdarea este ', 'joaca este importanta', 'joaca dezvolta ',
      'cum sa ', 'cum putem ', 'modalitati de a '
    ];
    if (genericBrandOpenings.some(opening => hook.startsWith(opening))) return false;
    const signals = ['?', 'de ce ', 'cand ', 'uneori ', 'nu ', 'mai mult decat', 'inainte sa', 'poate fi', 'nu inseamna', 'fara sa'];
    return signals.some(signal => String(heading).includes(signal) || hook.includes(normalizedCopy(signal)));
  }

  function carouselCopyPlanIsUsable(slides, context) {
    if (!Array.isArray(slides) || slides.length < MIN_CAROUSEL_SLIDES || slides.length > MAX_CAROUSEL_SLIDES) return false;
    if (!coverHookIsStrong(slides[0]?.heading)) return false;
    const headings = slides.slice(0, -1).map(slide => normalizedCopy(slide?.heading));
    if (headings.some(heading => heading.split(' ').filter(Boolean).length < 3)) return false;
    if (new Set(headings).size !== headings.length) return false;
    const bodies = slides.slice(1, -1).map(slide => normalizedCopy(slide?.body));
    if (bodies.some(body => body.split(' ').filter(Boolean).length < 5)) return false;
    if (new Set(bodies).size !== bodies.length) return false;
    if (!slides.slice(1, -1).every(slide => solutionIsPractical(slide?.heading))) return false;
    const contentCopy = slides.slice(1, -1).map(slide => normalizedCopy(`${slide?.heading || ''} ${slide?.body || ''}`));
    const hasProgressionSignal = contentCopy.slice(1).some(copy => [
      'daca ', 'inca ', 'apoi ', 'mai intai ', 'urmatorul ', 'abia dupa '
    ].some(signal => copy.includes(signal)));
    if (!hasProgressionSignal) return false;
    const coverCopy = normalizedCopy(`${slides[0]?.heading || ''} ${slides[0]?.body || ''}`);
    const promisesImmediateHelpMoment = coverCopy.includes('ajutor') && (coverCopy.includes('inainte sa incer') || coverCopy.includes('primul pas'));
    const driftsOutsidePromisedMoment = contentCopy.some(copy => [
      'observa efortul', 'nu doar rezultatul', 'despre proces', 'ce a descoperit',
      'ce ar schimba', 'incheie cu', 'dupa activitate', 'la final'
    ].some(signal => copy.includes(signal)));
    if (promisesImmediateHelpMoment && driftsOutsidePromisedMoment) return false;
    const repeatedHeadingAsBody = slides.slice(1, -1).some(slide => {
      const heading = normalizedCopy(slide?.heading);
      const body = normalizedCopy(slide?.body);
      return heading && body && (heading === body || body.startsWith(heading) || heading.startsWith(body));
    });
    if (repeatedHeadingAsBody) return false;
    const brief = normalizedCopy(context);
    const copiedBriefCount = [...headings, ...bodies].filter(copy => copy && brief && (copy === brief || copy.length > 28 && brief.includes(copy) || brief.length > 28 && copy.includes(brief))).length;
    return copiedBriefCount < 2;
  }

  function localCarouselCopyFallback(context) {
    const clean = String(context).replace(/\s+/g, ' ').trim();
    const sentences = (clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean]).map(item => item.trim()).filter(item => item.length > 18);
    const headingFrom = (text, fallback) => {
      const words = String(text || fallback).replace(/^[.…\s]+/, '').split(/\s+/).filter(Boolean);
      return `${words.slice(0, 9).join(' ')}${words.length > 9 ? '…' : ''}`;
    };
    const source = index => sentences[index] || '';
    const hookSource = sentences.find(sentence => sentence.includes('?')) || source(0);
    const enoughSourceMaterial = sentences.length >= 3;
    const entries = enoughSourceMaterial ? [
      { heading: headingFrom(hookSource, 'Ce ne arată joaca despre copii?'), body: '', artworkInstruction: 'Un singur simbol watercolor expresiv pentru ideea principală.' },
      { heading: headingFrom(source(0), 'Joaca este mai mult decât timp liber.'), body: source(0), artworkInstruction: 'Un singur simbol watercolor care ilustrează clar ideea acestui slide.' },
      { heading: headingFrom(source(1), 'Copiii învață prin experiențe împreună.'), body: source(1), artworkInstruction: 'Un obiect simplu watercolor care sugerează cooperare și descoperire.' },
      { heading: headingFrom(source(2), 'Spațiul potrivit susține creșterea.'), body: source(2), artworkInstruction: 'Un singur simbol watercolor pentru creștere, joacă și conexiune.' },
      { heading: 'Facem loc pentru joacă cu sens?', body: state.brandSettings.defaultCta, artworkInstruction: '' }
    ] : [
      { heading: 'Joaca nu umple timpul. Îl transformă.', body: '', artworkInstruction: 'Becky foarte expresivă, surprinsă de o idee luminoasă care prinde formă.' },
      { heading: 'Copiii învață când pot încerca.', body: 'Joaca le oferă libertatea să testeze idei, să greșească în siguranță și să găsească singuri o cale.', artworkInstruction: 'Un cub watercolor cu mai multe trasee simple care duc spre aceeași stea.' },
      { heading: 'Conexiunea crește din atenție împărtășită.', body: 'Când adultul este prezent, explorarea devine și un moment în care copilul se simte văzut și ascultat.', artworkInstruction: 'Două piese watercolor diferite care se întâlnesc și formează o inimă simplă.' },
      { heading: 'Spațiul potrivit lasă loc descoperirii.', body: 'Un mediu bun nu dictează fiecare pas; oferă repere, siguranță și suficientă libertate pentru curiozitate.', artworkInstruction: 'O lupă watercolor prin care se vede un mic drum către o floare.' },
      { heading: 'Creștem prin joacă, împreună.', body: state.brandSettings.defaultCta, artworkInstruction: '' }
    ];
    return entries.map(entry => ({ ...entry, headingParts: semanticHeadingParts(entry.heading) }));
  }

  async function buildCarouselDraft() {
    const context = String(state.context || '').trim();
    if (!context) return document.querySelector('[data-cc-context]')?.focus();
    if (copyDraftBusy) return;
    copyDraftBusy = true;
    copyDraftError = '';
    copyDraftNotice = '';
    state.objective = 'connection';
    state.angle = 'emotional';
    state.format = 'carousel';
    state.carouselVariant = 'story-cards';
    state.carouselQuality = 'medium';
    render(true);
    try {
      if (generatedSlides.length >= carouselSlideCount()) await saveCarouselVersion('Backup automat · înainte de un draft text nou', { automatic: true });
      if (Array.isArray(state.selectedIdeaPlan) && (state.selectedIdeaPlan.length !== DEFAULT_CAROUSEL_SLIDES || state.selectedIdeaPlan.some(slide => slide?.preserveFinal))) {
        applyCarouselCopyPlan(state.selectedIdeaPlan);
        generatedSlides = [];
        frozenComposedSlides = [];
        await clearPersistedGeneratedSlides();
        state.step = 4;
        save();
        return;
      }
      const response = await apiFetch('/api/content/carousel/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, brand: state.brandSettings })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(result.plan?.slides) || result.plan.slides.length !== DEFAULT_CAROUSEL_SLIDES) throw new Error(result.error || 'Draftul nu a putut fi construit.');
      if (!carouselCopyPlanIsUsable(result.plan.slides, context)) throw new Error('AI-ul a întors texte repetitive sau a copiat brief-ul în slide-uri.');
      applyCarouselCopyPlan(result.plan.slides, result.plan.caption);
      generatedSlides = [];
      frozenComposedSlides = [];
      await clearPersistedGeneratedSlides();
      state.step = 4;
      save();
    } catch (error) {
      const fallbackPlan = Array.isArray(state.selectedIdeaPlan) && state.selectedIdeaPlan.length >= MIN_CAROUSEL_SLIDES
        ? state.selectedIdeaPlan
        : localCarouselCopyFallback(context);
      applyCarouselCopyPlan(fallbackPlan);
      generatedSlides = [];
      frozenComposedSlides = [];
      await clearPersistedGeneratedSlides();
      state.step = 4;
      save();
      copyDraftNotice = `Conexiunea AI este temporar indisponibilă (${error.message || 'eroare necunoscută'}). Am pregătit un draft local editabil ca să nu te blochezi.`;
    } finally {
      copyDraftBusy = false;
      render(true);
    }
  }

  function bind(demo) {
    demo.querySelector('[data-cc-abandon-idea]')?.addEventListener('click', async event => {
      if (!window.confirm('Abandonezi această idee? Draftul, imaginile și backupurile lui automate vor fi șterse. Versiunile salvate de tine rămân în bibliotecă.')) return;
      const contentItemId = state.contentItemId;
      event.currentTarget.disabled = true;
      event.currentTarget.textContent = 'Șterg draftul…';
      try {
        await deleteAbandonedDraft(contentItemId);
        const globalState = {
          campaigns: cloneValue(state.campaigns || []),
          activeCampaignId: state.activeCampaignId,
          savedIdeas: cloneValue(state.savedIdeas || []),
          brandSettings: cloneValue(state.brandSettings || defaults.brandSettings)
        };
        state = { ...defaults, ...globalState, contentItemId: '', contentView: 'home', selectedContentItemKey: '', contentDetailTab: 'manual' };
        generatedSlides = [];
        frozenComposedSlides = [];
        carouselError = '';
        versionMessage = '';
        save(false);
        render();
      } catch (error) {
        event.currentTarget.disabled = false;
        event.currentTarget.textContent = 'Abandonează ideea';
        carouselError = `Draftul nu a putut fi șters: ${error.message}`;
        render(true);
      }
    });
    demo.querySelectorAll('[data-cc-view]').forEach(button => button.addEventListener('click', () => {
      state.contentView = button.dataset.ccView;
      if (state.contentView === 'content') state.selectedContentItemKey = '';
      save(false);
      render();
    }));
    demo.querySelectorAll('[data-cc-open-content]').forEach(button => button.addEventListener('click', () => {
      state.contentView = 'content';
      state.selectedContentItemKey = button.dataset.ccOpenContent;
      state.contentDetailTab = 'manual';
      save(false);
      render();
    }));
    demo.querySelectorAll('[data-cc-open-draft]').forEach(button => button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Deschid draftul…';
      try {
        await restoreDraft(button.dataset.ccOpenDraft);
        render();
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Draft indisponibil';
      }
    }));
    demo.querySelector('[data-cc-close-content]')?.addEventListener('click', () => {
      state.selectedContentItemKey = '';
      state.contentDetailTab = 'manual';
      save(false);
      render();
    });
    demo.querySelectorAll('[data-cc-content-detail-tab]').forEach(button => button.addEventListener('click', () => {
      state.contentDetailTab = button.dataset.ccContentDetailTab;
      save(false);
      render(true);
    }));
    demo.querySelectorAll('[data-cc-start]').forEach(button => button.addEventListener('click', () => {
      if (button.dataset.ccStart === 'ideas') {
        state.ideaBranch = '';
        state.contentView = 'ideas';
        save(false);
        render();
        return;
      }
      beginNewContent(button.dataset.ccStart);
    }));
    demo.querySelectorAll('[data-cc-idea-branch]').forEach(button => button.addEventListener('click', () => {
      state.ideaBranch = button.dataset.ccIdeaBranch;
      save(false);
      render();
    }));
    demo.querySelector('[data-cc-ideas-back]')?.addEventListener('click', () => {
      state.ideaBranch = '';
      save(false);
      render();
    });
    demo.querySelectorAll('[data-cc-use-idea]').forEach(button => button.addEventListener('click', async () => {
      const branch = state.ideaBranch;
      const ideaIndex = Number(button.dataset.ccUseIdea);
      const context = button.dataset.ccIdeaContext || '';
      const fallbackPlan = curatedIdeaPlan(branch, ideaIndex);
      button.disabled = true;
      button.textContent = '✦ Pregătesc draftul…';
      await beginNewContent('ideas', branch);
      state.context = context;
      state.creationEntry = 'ideas';
      state.selectedIdeaPlan = fallbackPlan;
      save();
      await buildCarouselDraft();
    }));
    demo.querySelector('[data-cc-build-draft]')?.addEventListener('click', buildCarouselDraft);
    demo.querySelector('[data-cc-context-back]')?.addEventListener('click', () => { state.step = 1; save(false); render(); });
    demo.querySelector('[data-cc-continue]')?.addEventListener('click', () => {
      state.contentView = 'create';
      if (generatedSlides.length >= carouselSlideCount()) state.step = 4;
      save(false);
      render();
    });
    demo.querySelectorAll('[data-cc-open-version]').forEach(button => button.addEventListener('click', async () => {
      if (versionBusy) return;
      versionBusy = true;
      button.disabled = true;
      button.textContent = 'Deschid…';
      try {
        await restoreCarouselVersion(button.dataset.ccOpenVersion);
        versionBusy = false;
        render();
      } catch (error) {
        versionBusy = false;
        versionMessage = `Versiunea nu a putut fi deschisă: ${error.message}`;
        render(true);
      }
    }));
    demo.querySelectorAll('[data-cc-version-variation]').forEach(button => button.addEventListener('click', () => beginVariationFromVersion(button.dataset.ccVersionVariation)));
    demo.querySelector('[data-cc-show-campaign-form]')?.addEventListener('click', () => demo.querySelector('[data-cc-campaign-form]')?.classList.remove('is-hidden'));
    demo.querySelector('[data-cc-hide-campaign-form]')?.addEventListener('click', () => demo.querySelector('[data-cc-campaign-form]')?.classList.add('is-hidden'));
    demo.querySelector('[data-cc-campaign-form]')?.addEventListener('submit', event => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const id = `campaign-${Date.now()}`;
      const campaign = {
        id,
        name: String(formData.get('name') || '').trim(),
        objective: String(formData.get('objective') || '').trim(),
        description: String(formData.get('description') || '').trim(),
        status: 'active',
        createdAt: new Date().toISOString()
      };
      if (!campaign.name || !campaign.objective) return;
      state.campaigns = [...(state.campaigns || []), campaign];
      state.activeCampaignId = id;
      save(false);
      render(true);
    });
    demo.querySelectorAll('[data-cc-activate-campaign]').forEach(button => button.addEventListener('click', () => {
      state.activeCampaignId = button.dataset.ccActivateCampaign;
      save(false);
      render(true);
    }));
    demo.querySelector('[data-cc-brand-form]')?.addEventListener('submit', event => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      state.brandSettings = Object.fromEntries(Object.keys(defaults.brandSettings).map(key => [key, String(formData.get(key) || '').trim()]));
      save(false);
      const message = demo.querySelector('[data-cc-brand-message]');
      if (message) message.textContent = '✓ Vocea brandului a fost salvată.';
    });
    demo.querySelector('[data-cc-context]')?.addEventListener('input', event => { state.context = event.target.value; save(); });
    demo.querySelector('[data-cc-post-caption]')?.addEventListener('input', event => {
      state.postCaption = event.target.value;
      state.postCaptionAuto = false;
      state.postCaptionStyle = 'teaser-v1';
      save();
      const status = demo.querySelector('[data-cc-caption-status]');
      if (status) status.textContent = 'Modificările tale sunt salvate în draft.';
    });
    demo.querySelector('[data-cc-copy-caption]')?.addEventListener('click', async event => {
      const caption = demo.querySelector('[data-cc-post-caption]')?.value || '';
      const status = demo.querySelector('[data-cc-caption-status]');
      try {
        await navigator.clipboard.writeText(caption);
        event.currentTarget.textContent = '✓ Copiat';
        if (status) status.textContent = 'Caption-ul este gata de lipit în postare.';
      } catch {
        demo.querySelector('[data-cc-post-caption]')?.select();
        if (status) status.textContent = 'Textul a fost selectat. Folosește Copy din browser.';
      }
    });
    demo.querySelectorAll('[data-cc-objective]').forEach(button => button.addEventListener('click', () => { state.objective = button.dataset.ccObjective; generatedSlides = []; clearPersistedGeneratedSlides(); save(); render(); }));
    demo.querySelectorAll('[data-cc-angle]').forEach(button => button.addEventListener('click', () => { state.angle = button.dataset.ccAngle; generatedSlides = []; clearPersistedGeneratedSlides(); save(); render(); }));
    demo.querySelector('[data-cc-direction-criteria]')?.addEventListener('input', event => { state.directionCriteria = event.target.value; save(); });
    demo.querySelectorAll('[data-cc-angle-field]').forEach(field => field.addEventListener('input', event => { const key = event.target.dataset.ccAngleKey; state.angleEdits = { ...(state.angleEdits || {}), [key]: { ...(state.angleEdits?.[key] || {}), [event.target.dataset.ccAngleField]: event.target.value } }; save(); }));
    demo.querySelectorAll('[data-cc-plan-heading],[data-cc-plan-body]').forEach(field => field.addEventListener('input', event => { const index = Number(event.target.dataset.ccPlanHeading ?? event.target.dataset.ccPlanBody); const property = event.target.dataset.ccPlanHeading !== undefined ? 'heading' : 'body'; state.carouselSlides[index] = { ...(state.carouselSlides[index] || {}), [property]: event.target.value, ...(index === 0 && property === 'heading' ? { coverHookAuto: false } : {}), ...(index === 0 && property === 'body' ? { coverPromiseAuto: false } : {}), ...(index > 0 && index < state.carouselSlides.length - 1 ? { solutionAuto: false } : {}), ...(index === state.carouselSlides.length - 1 ? { ctaInsightAuto: false } : {}) }; save(); }));
    const deleteCardContainers = new Map();
    demo.querySelectorAll('[data-cc-move-card]').forEach(moveButton => {
      const index = Number(moveButton.dataset.ccMoveCard);
      const container = moveButton.closest('.cc-plan-move') || moveButton.closest('.cc-slide-order')?.querySelector(':scope > div:last-child');
      if (container && !deleteCardContainers.has(index)) deleteCardContainers.set(index, container);
    });
    deleteCardContainers.forEach((container, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cc-delete-card';
      button.dataset.ccDeleteCard = String(index);
      button.textContent = 'Șterge';
      button.title = 'Șterge această soluție';
      button.disabled = state.carouselSlides.length <= MIN_CAROUSEL_SLIDES;
      container.append(button);
    });
    demo.querySelectorAll('[data-cc-delete-card]').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.ccDeleteCard);
      const current = state.carouselSlides.map(item => ({ ...item }));
      if (current.length <= MIN_CAROUSEL_SLIDES || index < 1 || index >= current.length - 1) return;
      const effective = carouselPlan()[index];
      const discardedHeading = cleanCarouselText(effective?.heading || current[index]?.heading);
      if (discardedHeading) {
        state.discardedSolutionHeadings = [...new Set([...(state.discardedSolutionHeadings || []), discardedHeading])];
      }
      const generatedMode = generatedSlides.length === current.length;
      current.splice(index, 1);
      const titles = carouselSlideTitles(current.length);
      state.carouselSlides = current.map((item, slideIndex) => ({ ...item, title: titles[slideIndex] }));
      state.carouselSlides[0] = { ...state.carouselSlides[0], body: coverPromiseAfterResize(state.carouselSlides[0], current.length - 2) };
      if (generatedMode) {
        generatedSlides.splice(index, 1);
        frozenComposedSlides.splice(index, 1);
        frozenComposedSlides = frozenComposedSlides.map((slide, slideIndex) => slideIndex < generatedSlides.length - 1 ? null : slide);
        persistGeneratedSlides();
      }
      save(false);
      render(true);
    }));
    demo.querySelector('[data-cc-add-card]')?.addEventListener('click', async event => {
      const current = state.carouselSlides.map(item => ({ ...item }));
      if (current.length >= MAX_CAROUSEL_SLIDES) return;
      const generatedMode = generatedSlides.length === current.length;
      const generatedCta = generatedMode ? generatedSlides.pop() : null;
      const frozenCta = generatedMode ? frozenComposedSlides.pop() : null;
      const cta = current.pop() || {};
      const suggestion = nextUnusedSuggestedSolution(current.slice(1));
      const ctaCopy = cta.ctaInsightAuto === false ? cta : { ...cta, ...beckyCta(), headingParts: semanticHeadingParts(beckyCta().heading), ctaInsightAuto: true };
      current.push({
        title: '',
        heading: suggestion.heading,
        body: suggestion.body,
        headingParts: semanticHeadingParts(suggestion.heading),
        change: suggestion.artworkInstruction,
        assistantInstruction: '',
        layout: {}
      }, ctaCopy);
      const titles = carouselSlideTitles(current.length);
      state.carouselSlides = current.map((item, index) => ({ ...item, title: titles[index] }));
      state.carouselSlides[0] = { ...state.carouselSlides[0], body: coverPromiseAfterResize(state.carouselSlides[0], current.length - 2) };
      if (generatedMode) {
        const newIndex = current.length - 2;
        generatedSlides.push(emptyArtworkResult(), generatedCta || emptyArtworkResult());
        frozenComposedSlides.push(null, frozenCta || null);
        slideRegeneratingIndex = newIndex;
        event.currentTarget.disabled = true;
        save(false);
        render(true);
        try {
          generatedSlides[newIndex] = await requestArtwork(carouselPlan()[newIndex], newIndex);
          await persistGeneratedSlides();
        } catch (error) {
          carouselError = `Soluția a fost adăugată, dar ilustrația nu a putut fi generată: ${error.message}`;
        } finally {
          slideRegeneratingIndex = -1;
          render(true);
        }
        return;
      }
      save(false);
      render(true);
      requestAnimationFrame(() => document.querySelector('.cc-plan-grid')?.scrollTo({ left: 99999, behavior: 'smooth' }));
    });
    demo.querySelector('[data-cc-remove-card]')?.addEventListener('click', () => {
      const current = state.carouselSlides.map(item => ({ ...item }));
      if (current.length <= MIN_CAROUSEL_SLIDES) return;
      const generatedMode = generatedSlides.length === current.length;
      const removedIndex = current.length - 2;
      current.splice(current.length - 2, 1);
      const oldCta = current[current.length - 1];
      const ctaCopy = beckyCta();
      current[current.length - 1] = oldCta.ctaInsightAuto === false ? oldCta : { ...oldCta, ...ctaCopy, headingParts: semanticHeadingParts(ctaCopy.heading), ctaInsightAuto: true };
      const titles = carouselSlideTitles(current.length);
      state.carouselSlides = current.map((item, index) => ({ ...item, title: titles[index] }));
      state.carouselSlides[0] = { ...state.carouselSlides[0], body: coverPromiseAfterResize(state.carouselSlides[0], current.length - 2) };
      if (generatedMode) {
        generatedSlides.splice(removedIndex, 1);
        frozenComposedSlides.splice(removedIndex, 1);
        frozenComposedSlides = frozenComposedSlides.map((slide, index) => index < generatedSlides.length - 1 ? null : slide);
        persistGeneratedSlides();
      }
      save(false);
      render(true);
    });
    demo.querySelectorAll('[data-cc-move-card]').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.ccMoveCard);
      const direction = Number(button.dataset.ccMoveDirection);
      const targetIndex = index + direction;
      const lastSolutionIndex = state.carouselSlides.length - 2;
      if (index < 1 || index > lastSolutionIndex || targetIndex < 1 || targetIndex > lastSolutionIndex) return;
      // Materialize auto-generated copy before reordering. Otherwise the copy
      // would be regenerated from its position while only the artwork moved.
      const effectivePlan = carouselPlan();
      const nextSlides = state.carouselSlides.map((item, slideIndex) => {
        const effective = effectivePlan[slideIndex];
        if (!effective || effective.role !== 'content') return { ...item };
        return {
          ...item,
          heading: effective.heading,
          body: effective.body,
          headingParts: effective.headingParts?.map(part => ({ ...part })) || semanticHeadingParts(effective.heading),
          change: effective.change || item.change || '',
          layout: { ...(effective.layout || item.layout || {}) },
          solutionAuto: false
        };
      });
      [nextSlides[index], nextSlides[targetIndex]] = [nextSlides[targetIndex], nextSlides[index]];
      const titles = carouselSlideTitles(nextSlides.length);
      state.carouselSlides = nextSlides.map((item, slideIndex) => ({ ...item, title: titles[slideIndex] }));
      if (generatedSlides.length) {
        [generatedSlides[index], generatedSlides[targetIndex]] = [generatedSlides[targetIndex], generatedSlides[index]];
        frozenComposedSlides[index] = null;
        frozenComposedSlides[targetIndex] = null;
        persistGeneratedSlides();
      }
      save(false);
      render(true);
      requestAnimationFrame(() => document.querySelector(`[data-cc-move-card="${targetIndex}"]`)?.focus());
    }));
    demo.querySelector('[data-cc-new-direction]')?.addEventListener('click', () => {
      const criteria = (state.directionCriteria || '').trim();
      if (!criteria) return demo.querySelector('[data-cc-direction-criteria]')?.focus();
      const stamp = Date.now();
      const customAngles = [
        { key: `custom-${stamp}-1`, letter: 'D', label: 'Clarifică fără să vândă', short: 'Educațională', reason: `${criteria} · Explică simplu ce trebuie să înțeleagă părintele, fără presiune comercială.`, hook: '' },
        { key: `custom-${stamp}-2`, letter: 'E', label: 'Pornește de la viața reală', short: 'Relatable', reason: `${criteria} · Începe cu o situație concretă în care părintele se poate recunoaște.`, hook: '' },
        { key: `custom-${stamp}-3`, letter: 'F', label: 'Arată rezultatul concret', short: 'Beneficiu', reason: `${criteria} · Face vizibil ce câștigă copilul și familia după experiență.`, hook: '' }
      ];
      state.customAngles = [...(state.customAngles || []), ...customAngles];
      state.angle = customAngles[0].key;
      state.directionCriteria = '';
      generatedSlides = [];
      clearPersistedGeneratedSlides();
      save();
      render();
    });
    demo.querySelectorAll('[data-cc-format]').forEach(button => button.addEventListener('click', () => { state.format = button.dataset.ccFormat; generatedSlides = []; clearPersistedGeneratedSlides(); save(); render(); }));
    demo.querySelectorAll('[data-cc-carousel-variant]').forEach(button => button.addEventListener('click', () => { state.carouselVariant = button.dataset.ccCarouselVariant; state.carouselSlides = carouselVariants[state.carouselVariant].slides.map((title, index) => ({ ...(state.carouselSlides[index] || {}), title })); generatedSlides = []; clearPersistedGeneratedSlides(); save(); render(); }));
    demo.querySelectorAll('[data-cc-slide]').forEach(input => input.addEventListener('input', () => { const index = Number(input.dataset.ccSlide); state.carouselSlides[index] = { ...(state.carouselSlides[index] || {}), title: input.closest('label')?.querySelector('span')?.textContent || '', change: input.value }; save(); }));
    demo.querySelectorAll('[data-cc-edit-tab]').forEach(tab => tab.addEventListener('click', () => { const controls = tab.closest('.cc-slide-controls'); controls.querySelectorAll('[data-cc-edit-tab]').forEach(item => item.classList.toggle('is-active', item === tab)); controls.querySelectorAll('[data-cc-edit-panel]').forEach(panel => panel.classList.toggle('is-hidden', panel.dataset.ccEditPanel !== tab.dataset.ccEditTab)); }));
    demo.querySelectorAll('[data-cc-slide-body]').forEach(input => input.addEventListener('input', () => {
      const index = Number(input.dataset.ccSlideBody);
      previewCompositionRevision += 1;
      state.carouselSlides[index] = {
        ...(state.carouselSlides[index] || {}),
        body: input.value,
        ...(index === 0 ? { coverPromiseAuto: false } : {}),
        ...(index > 0 && index < state.carouselSlides.length - 1 ? { solutionAuto: false } : {}),
        ...(index === state.carouselSlides.length - 1 ? { ctaInsightAuto: false } : {})
      };
      save();
    }));
    const syncHeadingParts = (control, index) => { const parts = [...control.querySelectorAll(`[data-cc-heading-part-text="${index}"]`)].map((input, partIndex) => ({ text: input.value, color: control.querySelector(`[data-cc-heading-part-color="${index}"][data-cc-heading-part-index="${partIndex}"]`)?.value === 'coral' ? 'coral' : 'teal', breakBefore: control.querySelector(`[data-cc-heading-part-break="${index}"][data-cc-heading-part-index="${partIndex}"]`)?.value !== 'inline' })).filter(part => part.text.trim()); previewCompositionRevision += 1; state.carouselSlides[index] = { ...(state.carouselSlides[index] || {}), heading: parts.map(part => part.text).join(' '), headingParts: parts, ...(index === 0 ? { coverHookAuto: false } : {}), ...(index > 0 && index < state.carouselSlides.length - 1 ? { solutionAuto: false } : {}), ...(index === state.carouselSlides.length - 1 ? { ctaInsightAuto: false } : {}) }; save(); };
    demo.querySelectorAll('[data-cc-heading-part-text],[data-cc-heading-part-color],[data-cc-heading-part-break]').forEach(input => ['input', 'change'].forEach(eventName => input.addEventListener(eventName, () => syncHeadingParts(input.closest('.cc-slide-controls'), Number(input.dataset.ccHeadingPartText || input.dataset.ccHeadingPartColor || input.dataset.ccHeadingPartBreak)))));
    demo.querySelectorAll('[data-cc-apply-text]').forEach(button => button.addEventListener('click', async () => {
      const index = Number(button.dataset.ccApplyText);
      const control = button.closest('.cc-slide-controls');
      const preview = button.closest('.cc-generated-slide')?.querySelector('.cc-slide-preview');
      syncHeadingParts(control, index);
      const bodyInput = control.querySelector(`[data-cc-slide-body="${index}"]`);
      state.carouselSlides[index] = {
        ...(state.carouselSlides[index] || {}),
        body: bodyInput?.value ?? state.carouselSlides[index]?.body ?? '',
        ...(index === 0 ? { coverPromiseAuto: false } : {}),
        ...(index > 0 && index < state.carouselSlides.length - 1 ? { solutionAuto: false } : {}),
        ...(index === state.carouselSlides.length - 1 ? { ctaInsightAuto: false } : {})
      };
      save();
      const compositionRevision = previewCompositionRevision;
      invalidateFrozenSlide(index);
      const updatedItem = carouselPlan()[index];
      const copy = preview?.querySelector('.cc-slide-copy');
      if (copy) {
        const headline = copy.querySelector('strong');
        if (headline) headline.innerHTML = headlineMarkup(updatedItem);
        let body = copy.querySelector('p');
        if (updatedItem.body && !body) { body = document.createElement('p'); copy.append(body); }
        if (body) { body.textContent = updatedItem.body || ''; body.hidden = !updatedItem.body; }
      }
      preview?.querySelectorAll('.cc-composed-preview').forEach(existing => existing.remove());
      textApplyBusy = index;
      button.disabled = true;
      button.textContent = 'Actualizez preview-ul…';
      preview?.classList.add('is-text-updating');
      try {
        const blob = await composeSlide(index);
        if (preview?.isConnected && compositionRevision === previewCompositionRevision) {
          const source = URL.createObjectURL(blob);
          const image = document.createElement('img');
          image.className = 'cc-composed-preview';
          image.alt = `Preview final slide ${index + 1}`;
          image.onload = () => URL.revokeObjectURL(source);
          image.src = source;
          preview.querySelectorAll('.cc-composed-preview').forEach(existing => existing.remove());
          preview.append(image);
        }
      } catch (error) {
        carouselError = error.message || 'Preview-ul nu a putut fi actualizat.';
        const notice = document.createElement('p');
        notice.className = 'cc-slide-assistant-status';
        notice.textContent = `Textul a fost aplicat. Preview-ul final nu s-a putut recompune: ${carouselError}`;
        control.append(notice);
      } finally {
        textApplyBusy = -1;
        button.disabled = false;
        button.textContent = 'Aplică textul în preview';
        preview?.classList.remove('is-text-updating');
      }
    }));
    demo.querySelector('[data-cc-quality]')?.addEventListener('change', event => { state.carouselQuality = event.target.value; save(); const guidance = qualityGuidance(event.target.value); const help = demo.querySelector('[data-cc-quality-help]'); if (help && guidance) help.innerHTML = `<b>${guidance.cost}</b> · ${guidance.time}<br>${guidance.quality}<br><em>Se aplică doar celor 4 ilustrații AI; CTA-ul nu se regenerează.</em>`; });
    demo.querySelector('[data-cc-generate-all]')?.addEventListener('click', generateCarousel);
    demo.querySelectorAll('[data-cc-regenerate]').forEach(button => button.addEventListener('click', () => regenerateSlide(Number(button.dataset.ccRegenerate))));
    demo.querySelectorAll('[data-cc-slide-assistant]').forEach(input => input.addEventListener('input', () => { const index = Number(input.dataset.ccSlideAssistant); state.carouselSlides[index] = { ...(state.carouselSlides[index] || {}), assistantInstruction: input.value }; save(); }));
    demo.querySelectorAll('[data-cc-apply-slide]').forEach(button => button.addEventListener('click', () => applySlideInstruction(Number(button.dataset.ccApplySlide))));
    demo.querySelector('[data-cc-save-version]')?.addEventListener('click', async event => {
      if (versionBusy) return;
      const name = demo.querySelector('[data-cc-version-name]')?.value.trim() || '';
      versionBusy = true;
      versionMessage = 'Salvez imaginile și compoziția exactă…';
      event.currentTarget.disabled = true;
      event.currentTarget.textContent = 'Salvez exact…';
      try {
        const version = await saveCarouselVersion(name);
        versionMessage = `„${version.name}” este protejată. Regenerările viitoare nu o pot modifica.`;
      } catch (error) {
        versionMessage = `Versiunea nu a putut fi salvată: ${error.message}`;
      } finally {
        versionBusy = false;
        render(true);
      }
    });
    demo.querySelector('[data-cc-restore-version]')?.addEventListener('click', async event => {
      const versionId = demo.querySelector('[data-cc-version-select]')?.value;
      if (!versionId || versionBusy) return demo.querySelector('[data-cc-version-select]')?.focus();
      versionBusy = true;
      event.currentTarget.disabled = true;
      event.currentTarget.textContent = 'Deschid versiunea…';
      try {
        await restoreCarouselVersion(versionId);
        versionBusy = false;
        render(true);
      } catch (error) {
        versionBusy = false;
        versionMessage = `Versiunea nu a putut fi deschisă: ${error.message}`;
        render(true);
      }
    });
    demo.querySelectorAll('[data-cc-carousel-scroll]').forEach(button => button.addEventListener('click', () => {
      const strip = demo.querySelector('.cc-generated-grid');
      strip?.scrollBy({ left: Number(button.dataset.ccCarouselScroll) * strip.clientWidth * .82, behavior: 'smooth' });
    }));
    demo.querySelectorAll('[data-cc-download-all]').forEach(button => button.addEventListener('click', async () => { const label = button.textContent; button.disabled = true; button.textContent = 'Pregătesc arhiva…'; try { await downloadCarousel(); } finally { button.disabled = false; button.textContent = label; } }));
    demo.querySelector('[data-cc-share-all]')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      const label = button.textContent;
      const indexes = DEVELOPMENT_SINGLE_IMAGE_MODE ? [DEVELOPMENT_GENERATED_SLIDE_INDEX] : generatedSlides.map((_, index) => index);
      button.disabled = true;
      button.textContent = 'Pregătesc imaginile…';
      try {
        await shareCarousel(indexes);
      } catch (error) {
        if (error.name !== 'AbortError') deliveryMessage = `Distribuirea nu a pornit: ${error.message}`;
      } finally {
        button.disabled = false;
        button.textContent = label;
        if (deliveryMessage) render(true);
      }
    });
    demo.querySelector('[data-cc-share-whatsapp]')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      const label = button.innerHTML;
      const indexes = DEVELOPMENT_SINGLE_IMAGE_MODE ? [DEVELOPMENT_GENERATED_SLIDE_INDEX] : generatedSlides.map((_, index) => index);
      button.disabled = true;
      button.textContent = 'Pregătesc pentru WhatsApp…';
      try {
        deliveryMessage = 'Alege WhatsApp din meniul care se deschide, apoi conversația în care vrei să trimiți carouselul.';
        await shareCarousel(indexes);
      } catch (error) {
        if (error.name !== 'AbortError') deliveryMessage = `WhatsApp nu a putut fi deschis: ${error.message}`;
      } finally {
        button.disabled = false;
        button.innerHTML = label;
        if (deliveryMessage) render(true);
      }
    });
    demo.querySelectorAll('[data-cc-share-slide]').forEach(button => button.addEventListener('click', async event => {
      const target = event.currentTarget;
      const label = target.textContent;
      target.disabled = true;
      target.textContent = 'Pregătesc…';
      try {
        await shareCarousel([Number(target.dataset.ccShareSlide)]);
      } catch (error) {
        if (error.name !== 'AbortError') deliveryMessage = `Distribuirea nu a pornit: ${error.message}`;
      } finally {
        target.disabled = false;
        target.textContent = label;
        if (deliveryMessage) render(true);
      }
    }));
    demo.querySelectorAll('[data-cc-save-slide]').forEach(button => button.addEventListener('click', async event => {
      const target = event.currentTarget;
      const label = target.textContent;
      target.disabled = true;
      target.textContent = 'Pregătesc…';
      try {
        downloadFile(await composedFile(Number(target.dataset.ccSaveSlide)));
      } finally {
        target.disabled = false;
        target.textContent = label;
      }
    }));
    demo.querySelector('[data-cc-next]')?.addEventListener('click', () => {
      if (state.step === 1 && !state.context.trim()) return demo.querySelector('[data-cc-context]')?.focus();
      if (state.step === 2 && !state.angle) return;
      if (state.step === 3 && !state.format) return;
      state.step = Math.min(4, state.step + 1); save(); render();
    });
    demo.querySelectorAll('[data-cc-back]').forEach(button => button.addEventListener('click', () => { state.step = Math.max(1, state.step - 1); save(); render(); }));
    demo.querySelectorAll('[data-cc-task]').forEach(input => input.addEventListener('change', () => { state.tasks[input.dataset.ccTask] = input.checked; save(); render(); }));
    demo.querySelector('[data-cc-reset]')?.addEventListener('click', () => beginNewContent('own'));
  }

  function render(preserveScroll = false) {
    if (!contentRouteIsActive()) return;
    const demo = prepareShell();
    if (!demo) return;
    const previousScroll = preserveScroll ? demo.scrollTop : 0;
    const previousWindowScroll = preserveScroll ? window.scrollY : 0;
    const previousCarouselScroll = preserveScroll ? demo.querySelector('.cc-generated-grid')?.scrollLeft || 0 : 0;
    const activeStep = state.step === 4 ? briefStep() : contextStep();
    const view = state.contentView || 'home';
    const activeView = view === 'home' ? homeView()
      : view === 'ideas' ? ideasView()
      : view === 'campaigns' ? campaignsView()
      : view === 'content' ? contentLibraryView()
      : view === 'brand' ? brandView()
      : `<div class="cc-create-view">${statusStrip()}${activeStep}${state.step === 4 && state.format === 'carousel' ? postCaptionPanel() : ''}</div>`;
    demo.innerHTML = `<div class="cc-shell cc-os-shell">
      ${contentDirectorNav()}
      ${activeView}
    </div>`;
    bind(demo);
    if (view === 'create') renderComposedPreviews(demo);
    requestAnimationFrame(() => {
      if (view === 'create') enforceArtworkSpacing(demo);
      if (preserveScroll) {
        const grid = demo.querySelector('.cc-generated-grid');
        if (grid) grid.scrollLeft = previousCarouselScroll;
        window.scrollTo(0, previousWindowScroll);
      }
    });
    document.fonts?.ready.then(() => requestAnimationFrame(() => {
      if (view === 'create') {
        enforceArtworkSpacing(demo);
        renderComposedPreviews(demo);
      }
      if (preserveScroll) {
        const grid = demo.querySelector('.cc-generated-grid');
        if (grid) grid.scrollLeft = previousCarouselScroll;
        window.scrollTo(0, previousWindowScroll);
      }
    }));
    demo.scrollTop = preserveScroll ? previousScroll : 0;
  }

  window.renderContentCreator = (options = {}) => {
    if (options.home) {
      state.contentView = 'home';
      save(false);
    }
    render(Boolean(options.preserveScroll));
  };
})();
