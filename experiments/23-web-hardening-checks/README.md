# 23 — Web hardening checks (2026-11-10)

A batch of read-only checks against the support app, CDN, buckets, and WebSocket
edge. Most were negative; they are recorded so they are not repeated.

## Next.js middleware bypass (CVE-2025-29927 class)

The support app ships Next.js 14.2.3 (visible in the public source maps). Any
request carrying `x-middleware-subrequest` is blocked by Cloudflare with a 403
page, including empty/short values and mixed-case header names. Direct testing
through the edge is therefore **inconclusive**, not confirmed exploitable.

Evidence: `18-sse-channel-binding/results-nextjs-middleware.txt`,
`results-nextjs-middleware2.txt`, `results-nextjs-other-hosts.txt`.

## `/_next/image` SSRF / open proxy

| URL parameter | Result |
|---|---|
| `/favicon.ico` | 200 image/png |
| `//example.com/`, `///example.com/` | 400 protocol-relative not allowed |
| `/\example.com/`, `/%5C%5Cexample.com/` | 400 not a valid image |
| `http://127.0.0.1:80/` | 400 `"url" parameter is not allowed` |
| `https://csm-fe.bblcdn.com/...`, `https://csm.bblcdn.com/` | 400 not allowed |
| `https://support.bambulab.cn/favicon.ico` | 400 not allowed |
| `http://169.254.169.254/latest/meta-data/` | 403 Cloudflare (WAF), not an app response |

No external host is allowed by the optimizer; only same-origin relative paths
work. No SSRF evidence.

Evidence: `18-sse-channel-binding/results-nextjs-image.txt`.

## WebSocket `/ws/cus`

Handshake to `wss://oepa.bblops.com/csm/gateway/ws/cus` returns **401
Unauthorized** with no ticket and with fake tickets (`TEST`, `1`, a forged JWT).
The edge is APISIX 3.8.1. Auth holds.

Evidence: `18-sse-channel-binding/results-ws.txt`.

## DNS / subdomain takeover

| Host | CNAME | Assessment |
|---|---|---|
| `csm-fe.bblcdn.com` | `d2cnd0ycm1v881.cloudfront.net` | CloudFront, not claimable |
| `csm.bblcdn.com` | `d1e6spz0zg7ii0.cloudfront.net` | CloudFront, not claimable |
| `public-stage.bblmw.cn` | `*.w.kunlunaq.com` | Alibaba CDN |
| `event.bblmw.cn` | `*.a1.initpp.com` | Alibaba CDN |
| `oepa.bblops.com` | `*.awsglobalaccelerator.com` | AWS Global Accelerator |
| `portal.bblmw.cn`, `hub-fe.bblcdn.cn` | `*.w.kunluncan.com` / `kunlunaq.com` | Alibaba CDN |

No dangling CNAME to an unclaimed S3/Heroku/GitHub/ Azure resource.

## S3 / OSS bucket sub-resources

`?acl`, `?policy`, `?cors`, `?website`, `?logging`, `?versioning`, `?tagging`,
`?encryption`, `?lifecycle`, `?replication`, `?notification`, `?inventory`,
`?analytics`, `?metrics`, `?object-lock`, `?legal-hold`, `?retention`,
`?uploads`, `?list-type=2`, `?prefix=` on both buckets all return **403
AccessDenied**. No listing, ACL, or policy disclosure.

Evidence: `16-gateway-auth-bypass/results-bucket-subresources.txt`.

## Host header / cache poisoning

`X-Forwarded-Host: evil.example`, `X-Host`, `X-Forwarded-Server`, and
`Host: evil.example` on `/liveChat` do not reflect the value; `X-Original-URL`
is blocked by Cloudflare (403). `Cache-Control: no-store` on the HTML. No
cache-poisoning evidence.

Evidence: `18-sse-channel-binding/results-host-header.txt`.

## `/liveChat` query reflection

`channel`, `store`, `from`, `lang`, `language`, `region`, `ticket`, `redirect`,
`to`, `issueTypeId`, `qr_channel`, `qr_store`, `utm_source` with a benign marker
are not reflected in the SSR HTML (19,106 bytes, identical). Payloads with
`<img onerror>` are blocked by Cloudflare (403). No reflected XSS.

Evidence: `19-public-endpoint-injection/results-livechat-reflection*.txt`.

## `front/fuzzy`

- HTML/XSS payloads are not reflected; only matched words from server-side
  topics are wrapped in `<span style="color: #0E65E9;">`.
- Time-based SQLi payloads (`SLEEP(5)`, `pg_sleep(5)`, `WAITFOR DELAY`,
  `DBMS_PIPE.RECEIVE_MESSAGE`) all return in ~300 ms. No SQLi evidence.

Evidence: `19-public-endpoint-injection/results-fuzzy-xss.txt`,
`results-fuzzy-sqli-time.txt`.

## Chatbot SSRF / external fetch

Prompts asking the bot to fetch `httpbin.org` or `169.254.169.254` are refused:
“I'm unable to ... perform external web requests”. Markdown image URLs are also
refused. No server-side fetch observed.

Evidence: `17-agent-tool-idor/results-ssrf-url.txt`.

## Metadata-field prompt injection

`uuid`, `sessionId`, `requestId`, `origin`, `machineModel`, and `cacheFlag` were
set to instruction-bearing strings. None produced the marker; non-boolean
`origin`/`cacheFlag` are rejected with `B00999`. No metadata prompt injection.

Evidence: `22-prompt-leak-framings/results-metadata-injection.txt`.

## API route enumeration

Common `/api/*` paths are 404 (the app shell) except `/api/robot`, which returns
the same app shell (not a JSON API). High request volume triggered Cloudflare
429s; no API route was found.

Evidence: `19-public-endpoint-injection/results-api-routes.txt`.