# StrategistAI

A separate internal menu for `team` and `super` users. Client users cannot render the workspace or invoke the generation endpoint. This feature does not require database migrations.

## Setup on Vercel

1. Set **OPENROUTER_API_KEY** in Vercel Project Settings → Environment Variables for the desired environments. Never use a `VITE_` prefix for the AI key.
2. Optionally set **OPENROUTER_MODEL** to an OpenRouter `provider/model` ID that supports structured outputs. If omitted, OpenRouter uses the account's default model. The request requires structured-output parameter support and providers that deny data collection; an incompatible model/provider returns a clear error rather than silently falling back to unstructured text.
3. Ensure **VITE_SUPABASE_URL** and **VITE_SUPABASE_ANON_KEY** are configured on Vercel. The endpoint can alternatively use **SUPABASE_URL** and **SUPABASE_ANON_KEY**. Do not use a service-role key.
4. Redeploy. Sign in with an internal account, open **StrategistAI**, choose scope/channel/period and click **Generate AI insights**.

`npm run dev` previews calculated indicators. To exercise the real `/api/strategist` endpoint locally, use `vercel dev` with server environment variables. Plain Vite does not execute Vercel functions. Configure an OpenRouter spending limit for the key to match the team's budget; generation is explicit and never triggered automatically by navigation or filters.

## What works without an AI key

- Scoped content counts and published metric coverage.
- Exact-copy exclusion (same title/client/brand/channel/format/date/brief/metrics), without deleting cards.
- Integer metric parsing, including `3.373` and `3,373` → 3373. Missing, fractional, shorthand and unsafe values are not converted to zero.
- Cohorts grouped by client + brand + channel + format; median views and median likes/views.
- Performance indicator: midrank percentile of views among at least five comparable published records. Ties receive identical scores. This is a descriptive indicator, not predicted success.
- Brief readiness: equal-weight detection of detailed brief (120+ characters), audience, objective/message, hook, CTA, and visual direction. Rules and missing markers are visible. This is structural completeness, not a creative-quality grade.
- Source-card links and explicit data-quality limitations.

## AI output and draft workflow

OpenRouter returns a structured report containing a summary, 1–3 evidence-backed insights, 1–5 experiment ideas, and limitations. Ideas include a hook, angle, format, rationale, measurement suggestion and source card IDs. Every source ID is validated against authorized evidence before returning results. AI claims remain hypotheses; the application does not validate the truth of every generated sentence.

“Review sebagai draft task” prefills the existing creation modal, carrying the first source card's client, brand and channel. Status starts at Idea, with no copied performance metrics. The user reviews and explicitly saves. This action does not publish content. Reports remain in component memory, are cleared when source data or filters change, and are never persisted to client-visible documents.

## Server boundary

`api/strategist.ts` uses a Node.js Vercel Function and OpenRouter Chat Completions. It validates the Supabase access token via `getUser`, then reads the member role from `team_members`. Client or unknown roles receive 403 before provider invocation. Data queries use the caller's JWT and public Supabase key, preserving RLS. Browser-supplied roles, brief text and metrics are never trusted.

Only selected, authorized content cards and their latest team comments are sent to OpenRouter. No personal documents, user profiles, attachments or external-link content are loaded. Up to 100 card IDs, 2,500 characters per brief, 100 comments of 500 characters, 100,000 total serialized input characters, and 3,500 output tokens keep requests bounded. Supabase calls time out at 10 seconds; provider generation at 45 seconds. HTTP responses are private/no-store. Provider errors never return the key or raw upstream payload.

The Vercel filesystem route takes precedence over the SPA fallback so `/api/strategist` reaches the function. Unknown `/api/*` paths return 404 instead of HTML.

## Validation and deployment limits

Unit/interaction tests cover metric parsing, duplicate exclusion, cohort isolation, readiness rules, client denial, invalid sessions, missing configuration, source validation, provider rate limits and draft callbacks. Browser tests cover internal desktop/mobile views and client denial with synthetic fixtures. No live OpenRouter generation was performed before the user's key is configured; provider success/error tests use mocked responses. No frontend production deployment or database policy change is included.

References: [OpenRouter API](https://openrouter.ai/docs/api/reference/overview), [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs), [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js), [Supabase Auth context](https://supabase.com/docs/guides/functions/auth-legacy-jwt).
