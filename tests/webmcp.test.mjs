import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import worker, { chatAnalysisProtocol, get, score } from '../worker/index.js';

test('bridge registers five branded tools and guards scoring consent', async () => {
  const source = await readFile(new URL('../public/webmcp.js', import.meta.url), 'utf8');
  const tools = [];
  const sandbox = { document: { modelContext: { async registerTool(tool) { tools.push(tool); } } }, fetch: async () => ({ ok: true, json: async () => ({ result: { structuredContent: {} } }) }), console };
  vm.runInNewContext(source, sandbox);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(tools.map((tool) => tool.name).sort(), ['medtests_get_chat_analysis_protocol','medtests_get_crisis_resources','medtests_get_screening','medtests_list_screenings','medtests_score_screening']);
  const scorer = tools.find((tool) => tool.name === 'medtests_score_screening');
  assert.throws(() => scorer.execute({ test_id: 'gad7', answers: [], consent_confirmed: false }, {}), /Explicit user consent/);
});

test('chat analysis protocol asks for source scope and blocks diagnostic causation claims', () => {
  const protocol = chatAnalysisProtocol('de');
  assert.ok(protocol.supported_sources.includes('claude'));
  assert.ok(protocol.supported_sources.includes('codex'));
  assert.ok(protocol.supported_sources.includes('gemini'));
  assert.match(protocol.ask_before_analysis.join(' '), /Welche Quellen/);
  assert.match(protocol.rules.join(' '), /Keine Diagnose/);
  assert.match(protocol.rules.join(' '), /keine Kausalität/);
});

test('GAD-7 is deterministic and answers are not echoed', () => {
  const questionnaire = get('gad7', 'en');
  const values = [2,2,2,2,1,2,1];
  const answers = questionnaire.questions.map((question, i) => ({ question_id: question.id, value: values[i] }));
  const result = score({ test_id: 'gad7', language: 'en', answers });
  assert.equal(result.total, 12);
  assert.equal(result.severity, 'moderate');
  assert.equal(result.diagnosis, false);
  assert.equal(result.privacy.answers_stored, false);
  assert.equal('answers' in result, false);
});

test('PHQ-9 self-harm item surfaces crisis resources', () => {
  const questionnaire = get('phq9', 'en');
  const answers = questionnaire.questions.map((question, i) => ({ question_id: question.id, value: i === 8 ? 1 : 0 }));
  const result = score({ test_id: 'phq9', language: 'en', answers });
  assert.equal(result.safety.crisis_signal, true);
  assert.equal(result.crisis_resources.us_canada.phone, '988');
});

test('MCP endpoint lists and calls tools', async () => {
  const env = { ASSETS: { fetch: () => new Response('asset') } };
  const listResponse = await worker.fetch(new Request('https://example.com/mcp', { method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) }), env);
  const listed = await listResponse.json();
  assert.equal(listed.result.tools.length, 5);
  const callResponse = await worker.fetch(new Request('https://example.com/mcp', { method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'list_screenings', arguments: { language: 'de' } } }) }), env);
  const called = await callResponse.json();
  assert.equal(called.result.structuredContent.screenings.length, 3);
});
