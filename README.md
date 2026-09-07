# ContentLab

ContentLab is InfinitiLabs' content operations workspace: plan campaigns, manage production, review content, and track results across clients and brands. Built with React, TypeScript, Vite and Supabase Auth/Postgres.

## What's new

**Focus Queue** turns the overview into an actionable worklist: deadlines first, then reviews and urgent work. Search by task, brand or person, filter overdue/today/review/unplanned work, and open any task directly. The queue respects the existing personal/studio and client/brand scope.

The September upgrade also retires the emergency login bypass, removes persistent workspace snapshots, protects account changes from late network responses, fixes local deadline calculations, and keeps rich-text editor code out of the initial React bundle. See [the audit](docs/AUDIT_2026-09-07.md) for evidence and remaining boundaries.

## StrategistAI

Internal teams have a separate StrategistAI menu with cohort benchmarks, brief readiness, and evidence-backed AI insights and experiment ideas. Generation runs through OpenRouter on a Vercel server function; configure `OPENROUTER_API_KEY` (server-only) and optionally `OPENROUTER_MODEL`, then redeploy. See [setup and methodology](docs/STRATEGIST_AI.md). Client users are denied in both the UI and API.

## Development

Use Node.js 22.12+.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Configure the Supabase project and public anon key in `.env.local`. Supabase Auth is mandatory; users need an Auth account mapped to `team_members.auth_user_id`. See [the Auth/RLS runbook](docs/AUTH_RLS_CUTOVER.md). The former `VITE_SUPABASE_AUTH_ENABLED` flag no longer disables authentication.

Workspace data stays in session memory and is fetched again after a page reload. It is cleared on account changes. Supabase manages its own authenticated session persistence. Google Sheets is a legacy/import integration only.

## Validation

```bash
npm run check                 # lint, regression tests, TypeScript and build
npx playwright install chromium
npm run test:browser          # desktop + mobile, synthetic data only
npm audit
```

For a deterministic Jakarta calendar check: `TZ=Asia/Jakarta npm test`.

During development, `/tests/browser/preview.html` previews the new dashboard with clearly synthetic fixtures. This is a test harness, not a production route; Vite's production build includes only the application entry.

GitHub Actions runs lint, tests, build, browser checks, and the production dependency audit on pull requests.

## Project structure

Start with [PROJECT_MAP.md](docs/PROJECT_MAP.md).

- `src/components/` — application views and reusable UI.
- `src/services/` — Supabase and legacy integration services.
- `src/utils/` — date calculations and deterministic Focus Queue logic.
- `tests/` — unit, session, interaction and browser regression coverage.
- `supabase/` — schema and migration history.
- `integrations/` — deployment-side integration scripts.
- `mcp-server/` — ContentLab's Model Context Protocol server.
- `docs/` — audit findings, operational runbooks and project notes.
