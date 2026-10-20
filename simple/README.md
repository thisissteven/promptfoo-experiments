# Promptfoo Red Team Template — Bambu Lab Chatbot

[中文文档](README.zh.md)

A ready-to-use Promptfoo red teaming template for the Bambu Lab live customer-service chatbot.

## Files

| File | Purpose |
|---|---|
| `bambuProvider.js` | Custom Promptfoo provider. Handles the SSE connection, `POST /chat`, session management (`sessionId` + `uuid`), and streaming responses. Works with or without a proxy. |
| `promptfooconfig.yaml` | Generation config. Used to generate `custom-intent.yaml`. Not run directly. Uses the `.com` site. |
| `custom-intent.yaml` | Generated test cases targeting the `.com` site. |
| `custom-intent-cn.yaml` | Same test cases, but pointing at the `.cn` site. **Update the `baseUrl` and `origin` fields to the `.cn` domain before running.** |
| `package.json` | Declares `undici` as a dependency (required by `bambuProvider.js`). |

## Requirements

- Node.js 18+
- Promptfoo installed globally: `npm install -g promptfoo`
- Install dependencies: `npm install`

## Adding custom intents or plugins

Edit the `intent:` list in `promptfooconfig.yaml`, then regenerate:

```bash
promptfoo redteam generate -c promptfooconfig.yaml -o custom-intent.yaml --force