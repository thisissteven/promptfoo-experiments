# 24 — HiAgent app-key and raw-proxy search

**Question:** Is a HiAgent `APPID`/API key, raw proxy path, webhook, or WAF
`/v1/check` endpoint exposed by the Bambu frontend or gateway?

## Source-map / bundle search

Searched the support-app JS and source maps (`18-sse-channel-binding/bundle/`)
for `APPID`, `apiKey`, `api_key`, `proxy/api/v1`, `trigger/webhook`, `webhook`,
`X-App-Key`, `AppKey`, `Bearer`, `SYS_USERID`, `SYS_USERNAME`.

Only Bambu auth `Bearer` strings were found (`bbl_token`, Handy bridge). No
HiAgent app key, API key, proxy path, webhook, or `SYS_USER*` variable.

Also searched the main-site HTML (`bambulab.com/zh`, 1.2 MB) and the JS chunks
that could be fetched: no hits.

## Direct HiAgent proxy paths

Tested on `support.bambulab.com`, `support.bambulab.cn`, and
`oepa.bblops.com/csm/gateway`:

- `/api/proxy/api/v1/get_app_config_preview`
- `/api/proxy/api/v1/chat_query`
- `/api/proxy/api/v1/create_conversation`
- `/api/proxy/api/v1/trigger/webhook`
- `/api/proxy/api/v1/v1/check`
- `/api/proxy/api/v1/run_app_workflow`
- `/proxy/api/v1/...`, `/trigger/webhook`, `/v1/check`, `/api/v1/check`

Results:

- `support.bambulab.com/.cn`: `404` (app shell) or `307` locale redirect to
  `/en/...`; the `/en/...` targets are `404`.
- `oepa.bblops.com/csm/gateway`: `403 IP address not allowed` for every
  non-`/cus/*` path.

No raw HiAgent proxy or WAF `/v1/check` endpoint was exposed.

## Conclusion

The HiAgent app key is server-side at the CSM gateway; it is not in the browser
bundle. Direct proxy/webhook/WAF paths are not reachable. The live
`get_app_config_preview` / `TracingJsonStr` / `UserID` tests remain blocked
without a sandbox app key (see `25-hiagent-sandbox/`).