(function () {
  'use strict';
  var modelContext = document.modelContext;
  if (!modelContext || typeof modelContext.registerTool !== 'function') return;
  var requestId = 0;
  var language = { type: 'string', enum: ['de', 'en'], default: 'en' };

  async function call(name, args, signal) {
    var response = await fetch('/mcp', {
      method: 'POST', signal: signal, credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'accept': 'application/json', 'mcp-protocol-version': '2025-11-25' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method: 'tools/call', params: { name: name, arguments: args || {} } }),
    });
    var payload = await response.json();
    if (!response.ok || payload.error || payload.result?.isError) throw new Error(payload.error?.message || payload.result?.structuredContent?.error?.message || 'Tool call failed');
    return JSON.stringify(payload.result.structuredContent);
  }

  var tools = [
    { name: 'medtests_list_screenings', title: 'Find a suitable screening', description: 'List available evidence-based self-screenings. Select from the user’s stated concern, never by guessing a diagnosis.', inputSchema: { type: 'object', properties: { language: language }, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: function (args, context) { return call('list_screenings', args, context?.signal); } },
    { name: 'medtests_get_screening', title: 'Get screening questions', description: 'Retrieve exact questions and allowed answers. Ask neutrally and do not infer answers.', inputSchema: { type: 'object', required: ['test_id'], properties: { test_id: { type: 'string' }, language: language }, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: function (args, context) { return call('get_screening', args, context?.signal); } },
    { name: 'medtests_score_screening', title: 'Score a completed screening', description: 'Score complete answers without storing or returning them. Call only after explicit user consent. Never a diagnosis.', inputSchema: { type: 'object', required: ['test_id', 'answers', 'consent_confirmed'], properties: { test_id: { type: 'string' }, language: language, consent_confirmed: { type: 'boolean', const: true }, answers: { type: 'array', items: { type: 'object', required: ['question_id', 'value'], properties: { question_id: { type: 'string' }, value: { type: 'number' } }, additionalProperties: false } } }, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: function (args, context) { if (args.consent_confirmed !== true) throw new Error('Explicit user consent is required before scoring.'); return call('score_screening', { test_id: args.test_id, language: args.language, answers: args.answers }, context?.signal); } },
    { name: 'medtests_get_crisis_resources', title: 'Get crisis resources', description: 'Return crisis contacts. Use instead of continuing a screening if immediate danger may be present.', inputSchema: { type: 'object', properties: { language: language }, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: function (args, context) { return call('get_crisis_resources', args, context?.signal); } },
    { name: 'medtests_get_chat_analysis_protocol', title: 'Analyze authorized chat context safely', description: 'Get a consent-first protocol for exploring symptom patterns across ChatGPT, Claude, Codex, Gemini, or other user-authorized transcripts. Never diagnose or claim causation.', inputSchema: { type: 'object', properties: { language: language }, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: function (args, context) { return call('get_chat_analysis_protocol', args, context?.signal); } },
  ];
  Promise.all(tools.map(function (tool) { return modelContext.registerTool(tool); })).catch(function (error) { console.warn('WebMCP registration failed', error); });
})();
