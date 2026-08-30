# medtests WebMCP

A standalone, auditable WebMCP demo for privacy-preserving mental-health self-screenings. It contains only the hackathon surface, not the full medtests.de website.

**Live demo:** https://medtests-webmcp-preview.carpal-cilantro.workers.dev

## What it exposes

- `medtests_list_screenings`
- `medtests_get_screening`
- `medtests_score_screening`
- `medtests_get_crisis_resources`
- `medtests_get_chat_analysis_protocol`

The browser-native tools call the same-origin MCP endpoint at `/mcp`. A small REST surface is available under `/api/screenings` and `/api/score`.

The optional [chat-context analysis page](https://medtests-webmcp-preview.carpal-cilantro.workers.dev/chat-analysis.html) gives any agent a consent-first prompt for looking for symptom patterns across authorized ChatGPT, Claude, Codex, Gemini, or other transcripts. It separates observations from hypotheses and explicitly forbids diagnosis or causal claims.

## Safety and privacy

- screening indications, never diagnoses
- explicit consent before browser-side scoring calls
- stateless scoring: answers are neither stored nor returned
- PHQ-9 self-harm responses surface crisis resources
- no accounts, advertising profiles, or analytics database
- German and English

This extracted demo includes GAD-7, PHQ-9, and ASRS-6 so reviewers can inspect the complete implementation in one small repository. The production medtests.de catalog remains separate.

## Run locally

```bash
npm install
npm test
npm run dev
```

Open the local page in a WebMCP-capable browser and use:

> Open this page and use its WebMCP tools. List the available screenings in English, retrieve the GAD-7 questions, and explain the privacy and consent rules before asking any question. Do not infer a diagnosis.

## Deploy to Cloudflare Workers

```bash
npm run deploy
```

No database or runtime secret is required.

Every push and pull request is also checked by GitHub Actions (tests plus a Cloudflare deployment dry run).

## License

MIT for the code. The screening instruments retain their original rights and attribution requirements; this repository is a technical interoperability demonstration, not medical advice.
