const MAX_BODY_BYTES = 64 * 1024;

const scale4 = {
  de: ['Überhaupt nicht', 'An einzelnen Tagen', 'An mehr als der Hälfte der Tage', 'Beinahe jeden Tag'],
  en: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'],
};

const screenings = {
  gad7: {
    id: 'gad7',
    name: { de: 'Angst-Screening (GAD-7)', en: 'Anxiety screening (GAD-7)' },
    description: { de: 'Sieben Fragen zu Angstsymptomen in den letzten zwei Wochen.', en: 'Seven questions about anxiety symptoms during the last two weeks.' },
    questions: {
      de: ['Nervosität, Ängstlichkeit oder Anspannung', 'Nicht in der Lage sein, Sorgen zu stoppen oder zu kontrollieren', 'Übermäßige Sorgen bezüglich verschiedener Angelegenheiten', 'Schwierigkeiten zu entspannen', 'Rastlosigkeit, sodass Stillsitzen schwerfällt', 'Schnelle Verärgerung oder Gereiztheit', 'Gefühl der Angst, als würde etwas Schlimmes passieren'],
      en: ['Feeling nervous, anxious, or on edge', 'Not being able to stop or control worrying', 'Worrying too much about different things', 'Trouble relaxing', 'Being so restless that it is hard to sit still', 'Becoming easily annoyed or irritable', 'Feeling afraid as if something awful might happen'],
    },
    score(total) {
      const severity = total >= 15 ? 'severe' : total >= 10 ? 'moderate' : total >= 5 ? 'mild' : 'minimal';
      return { total, maximum: 21, threshold: 10, severity, screening_result: total >= 10 ? 'positive' : 'below_threshold' };
    },
  },
  phq9: {
    id: 'phq9',
    name: { de: 'Depressions-Screening (PHQ-9)', en: 'Depression screening (PHQ-9)' },
    description: { de: 'Neun Fragen zu depressiven Symptomen in den letzten zwei Wochen.', en: 'Nine questions about depressive symptoms during the last two weeks.' },
    questions: {
      de: ['Wenig Interesse oder Freude an Tätigkeiten', 'Niedergeschlagenheit, Schwermut oder Hoffnungslosigkeit', 'Schwierigkeiten ein- oder durchzuschlafen oder vermehrter Schlaf', 'Müdigkeit oder Gefühl, keine Energie zu haben', 'Verminderter Appetit oder übermäßiges Bedürfnis zu essen', 'Schlechte Meinung von sich selbst; Gefühl, versagt zu haben', 'Schwierigkeiten, sich zu konzentrieren', 'So starke Verlangsamung oder Unruhe, dass es anderen auffallen könnte', 'Gedanken, lieber tot zu sein oder sich Leid zuzufügen'],
      en: ['Little interest or pleasure in doing things', 'Feeling down, depressed, or hopeless', 'Trouble falling or staying asleep, or sleeping too much', 'Feeling tired or having little energy', 'Poor appetite or overeating', 'Feeling bad about yourself or that you are a failure', 'Trouble concentrating on things', 'Moving or speaking slowly, or being unusually fidgety or restless', 'Thoughts that you would be better off dead or of hurting yourself'],
    },
    score(total, values) {
      const severity = total >= 20 ? 'severe' : total >= 15 ? 'moderately_severe' : total >= 10 ? 'moderate' : total >= 5 ? 'mild' : 'minimal';
      return { total, maximum: 27, threshold: 10, severity, screening_result: total >= 10 ? 'positive' : 'below_threshold', crisis_signal: values[8] > 0 };
    },
  },
  asrs6: {
    id: 'asrs6',
    name: { de: 'ADHS-Kurzscreening (ASRS-6)', en: 'ADHD short screening (ASRS-6)' },
    description: { de: 'Sechs Fragen zu ADHS-nahen Mustern bei Erwachsenen.', en: 'Six questions about ADHD-related patterns in adults.' },
    options: {
      de: ['Nie', 'Selten', 'Manchmal', 'Oft', 'Sehr oft'],
      en: ['Never', 'Rarely', 'Sometimes', 'Often', 'Very often'],
    },
    questions: {
      de: ['Probleme, die letzten Feinheiten einer Aufgabe abzuschließen', 'Schwierigkeiten, Aufgaben zu ordnen', 'Probleme, sich an Termine oder Verpflichtungen zu erinnern', 'Aufschieben von Aufgaben, die viel Denkaufwand erfordern', 'Zappeln mit Händen oder Füßen bei langem Sitzen', 'Gefühl, übermäßig aktiv oder wie von einem Motor angetrieben zu sein'],
      en: ['Trouble wrapping up the final details of a project', 'Difficulty getting things in order for a task', 'Problems remembering appointments or obligations', 'Avoiding or delaying tasks that require a lot of thought', 'Fidgeting with hands or feet when sitting for a long time', 'Feeling overly active and compelled to do things, as if driven by a motor'],
    },
    score(total, values) {
      const positive = values.filter((v, i) => v >= (i < 3 ? 2 : 3)).length;
      return { total, maximum: 24, threshold: 4, positive_items: positive, screening_result: positive >= 4 ? 'positive' : 'below_threshold' };
    },
  },
};

const crisis = {
  de: { language: 'de', immediate_danger: { label: 'Notruf', phone: '112' }, emotional_crisis: { label: 'TelefonSeelsorge', phone: '116123' }, instruction: 'Bei unmittelbarer Gefahr sofort den örtlichen Notruf wählen.' },
  en: { language: 'en', immediate_danger: { label: 'Local emergency services', phone: 'local emergency number' }, us_canada: { label: '988 Suicide & Crisis Lifeline', phone: '988' }, instruction: 'If there is immediate danger, call local emergency services now.' },
};

function chatAnalysisProtocol(language = 'de') {
  const lang = langOf(language);
  const sources = ['current_chat', 'chatgpt', 'claude', 'codex', 'gemini', 'other'];
  if (lang === 'en') return {
    language: 'en',
    purpose: 'Explore patterns and possible contributors across user-authorized chat transcripts. This is not diagnosis or proof of causation.',
    ask_before_analysis: [
      'Should I use only this chat, your chats in this service, or also exports from other services?',
      'Which sources and date range do you authorize?',
      'Have third-party names and identifying details been removed?',
      'What symptoms or changes should I trace, and when did they begin?',
    ],
    supported_sources: sources,
    output_sections: ['timeline', 'repeated_patterns', 'possible_contributors', 'supporting_evidence', 'contradicting_evidence', 'missing_information', 'safer_next_steps'],
    rules: ['Analyze only explicitly authorized material.', 'Separate direct quotes or observations from interpretation.', 'Rank hypotheses by support and show uncertainty.', 'Do not diagnose or claim that a chat proves causation.', 'Do not use identifiable third-party or patient data.', 'If immediate danger may be present, stop and surface local crisis resources.'],
  };
  return {
    language: 'de',
    purpose: 'Muster und mögliche Einflussfaktoren in vom Nutzer freigegebenen Chatverläufen untersuchen. Das ist keine Diagnose und kein Beweis für eine Ursache.',
    ask_before_analysis: [
      'Soll ich nur diesen Chat, deine Chats in diesem Dienst oder zusätzlich Exporte aus anderen Diensten verwenden?',
      'Welche Quellen und welchen Zeitraum gibst du frei?',
      'Sind Namen und identifizierende Angaben Dritter entfernt?',
      'Welche Symptome oder Veränderungen soll ich verfolgen, und wann begannen sie?',
    ],
    supported_sources: sources,
    output_sections: ['zeitlinie', 'wiederkehrende_muster', 'moegliche_einflussfaktoren', 'stuetzende_belege', 'gegenbelege', 'fehlende_informationen', 'sichere_naechste_schritte'],
    rules: ['Nur ausdrücklich freigegebenes Material analysieren.', 'Direkte Beobachtungen und Interpretation trennen.', 'Hypothesen nach Belegstärke ordnen und Unsicherheit zeigen.', 'Keine Diagnose stellen und aus Chats keine Kausalität behaupten.', 'Keine identifizierbaren Daten Dritter oder von Patienten verwenden.', 'Bei möglicher unmittelbarer Gefahr abbrechen und lokale Krisenhilfe anzeigen.'],
  };
}

const langOf = (value) => value === 'en' ? 'en' : 'de';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

function list(language = 'de') {
  const lang = langOf(language);
  return { language: lang, screenings: Object.values(screenings).map((s) => ({ id: s.id, name: s.name[lang], description: s.description[lang], question_count: s.questions[lang].length, result_type: 'screening_not_diagnosis' })) };
}

function get(testId, language = 'de') {
  const lang = langOf(language);
  const screening = screenings[testId];
  if (!screening) throw new Error('unknown_test');
  const labels = screening.options?.[lang] ?? scale4[lang];
  return {
    id: screening.id,
    name: screening.name[lang],
    description: screening.description[lang],
    language: lang,
    question_count: screening.questions[lang].length,
    questions: screening.questions[lang].map((text, i) => ({ id: `${screening.id}_${i + 1}`, text, answer_options: labels.map((label, value) => ({ value, label })) })),
    safety: { diagnostic_result: false, statement: lang === 'de' ? 'Screening-Hinweis, keine Diagnose.' : 'Screening indication, not a diagnosis.' },
    privacy: { stateless: true, answers_stored: false, answers_returned: false },
  };
}

function score({ test_id: testId, answers, language = 'de' }) {
  const lang = langOf(language);
  const screening = screenings[testId];
  if (!screening) throw new Error('unknown_test');
  if (!Array.isArray(answers)) throw new Error('invalid_answers');
  const byId = new Map(answers.map((answer) => [answer?.question_id, answer?.value]));
  const maximumValue = screening.options ? 4 : 3;
  const values = screening.questions[lang].map((_, i) => byId.get(`${testId}_${i + 1}`));
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > maximumValue)) throw new Error('incomplete_or_invalid_answers');
  const result = screening.score(values.reduce((a, b) => a + b, 0), values);
  return {
    test_id: testId,
    test_name: screening.name[lang],
    ...result,
    diagnosis: false,
    safety: { crisis_signal: Boolean(result.crisis_signal), statement: lang === 'de' ? 'Das Ergebnis ist ein Hinweis, keine Diagnose.' : 'The result is an indication, not a diagnosis.' },
    privacy: { answers_stored: false, answers_returned: false },
    ...(result.crisis_signal ? { crisis_resources: crisis[lang] } : {}),
  };
}

const mcpTools = [
  { name: 'list_screenings', description: 'List available evidence-based self-screenings. Never infer a diagnosis.', inputSchema: { type: 'object', properties: { language: { type: 'string', enum: ['de', 'en'] } }, additionalProperties: false } },
  { name: 'get_screening', description: 'Return exact questions and permitted answers for one screening.', inputSchema: { type: 'object', required: ['test_id'], properties: { test_id: { type: 'string' }, language: { type: 'string', enum: ['de', 'en'] } }, additionalProperties: false } },
  { name: 'score_screening', description: 'Statelessly score complete answers. The result is never a diagnosis.', inputSchema: { type: 'object', required: ['test_id', 'answers'], properties: { test_id: { type: 'string' }, language: { type: 'string', enum: ['de', 'en'] }, answers: { type: 'array', items: { type: 'object', required: ['question_id', 'value'], properties: { question_id: { type: 'string' }, value: { type: 'number' } } } } }, additionalProperties: false } },
  { name: 'get_crisis_resources', description: 'Return crisis resources. Stop screening if immediate danger may be present.', inputSchema: { type: 'object', properties: { language: { type: 'string', enum: ['de', 'en'] } }, additionalProperties: false } },
  { name: 'get_chat_analysis_protocol', description: 'Return a consent-first protocol for exploring symptom patterns across user-authorized ChatGPT, Claude, Codex, Gemini, or other chat transcripts. Never diagnoses or proves causation.', inputSchema: { type: 'object', properties: { language: { type: 'string', enum: ['de', 'en'] } }, additionalProperties: false } },
];

function callTool(name, args = {}) {
  if (name === 'list_screenings') return list(args.language);
  if (name === 'get_screening') return get(args.test_id, args.language);
  if (name === 'score_screening') return score(args);
  if (name === 'get_crisis_resources') return crisis[langOf(args.language)];
  if (name === 'get_chat_analysis_protocol') return chatAnalysisProtocol(args.language);
  throw new Error('unknown_tool');
}

async function handleMcp(request) {
  const bodyText = await request.text();
  if (new TextEncoder().encode(bodyText).length > MAX_BODY_BYTES) return json({ error: { code: -32600, message: 'Request too large' } }, 413);
  let body;
  try { body = JSON.parse(bodyText); } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400); }
  if (body.method === 'initialize') return json({ jsonrpc: '2.0', id: body.id, result: { protocolVersion: '2025-11-25', capabilities: { tools: {} }, serverInfo: { name: 'medtests-webmcp', version: '1.0.0' } } });
  if (body.method === 'tools/list') return json({ jsonrpc: '2.0', id: body.id, result: { tools: mcpTools } });
  if (body.method === 'tools/call') {
    try {
      const value = callTool(body.params?.name, body.params?.arguments);
      return json({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value, isError: false } });
    } catch (error) {
      return json({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: error.message }], structuredContent: { error: { message: error.message } }, isError: true } }, 400);
    }
  }
  return json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: 'Method not found' } }, 404);
}

export { callTool, chatAnalysisProtocol, get, list, score };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/mcp' && request.method === 'POST') return handleMcp(request);
    if (url.pathname === '/api/screenings' && request.method === 'GET') return json(list(url.searchParams.get('lang')));
    if (url.pathname.startsWith('/api/screenings/') && request.method === 'GET') {
      try { return json(get(decodeURIComponent(url.pathname.split('/').pop()), url.searchParams.get('lang'))); } catch { return json({ error: 'unknown_test' }, 404); }
    }
    if (url.pathname === '/api/score' && request.method === 'POST') {
      try { return json(score(await request.json())); } catch (error) { return json({ error: error.message }, 400); }
    }
    return env.ASSETS.fetch(request);
  },
};
