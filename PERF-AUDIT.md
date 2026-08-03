# ContentLab — Performance Audit & Triage (P0)

Stack: React 19 + Vite 8 (rolldown), Supabase / Google Sheets data providers.

## Baseline (before)

Single monolithic bundle — everything loaded up front:

```
dist/assets/index.css     73.85 kB │ gzip:  12.74 kB
dist/assets/index.js     655.49 kB │ gzip: 175.51 kB   ← one chunk
```

Plus a Rollup `INEFFECTIVE_DYNAMIC_IMPORT` warning and a "chunk > 500 kB" warning.

## After P0

Code-split into cacheable vendor chunks + per-view lazy chunks:

```
index.js            74.27 kB │ gzip: 19.86 kB   ← initial app shell
react-vendor       206.33 kB │ gzip: 65.70 kB   ← cached across deploys
supabase-vendor    208.35 kB │ gzip: 53.92 kB   ← cached across deploys
DashboardView       20.04 kB │ gzip:  4.43 kB   ┐
KanbanBoard          6.74 kB │ gzip:  2.38 kB   │ loaded on demand
CalendarView         6.54 kB │ gzip:  1.95 kB   │ (route-level lazy)
ListView            12.85 kB │ gzip:  3.40 kB   │
AnalyticsView       15.49 kB │ gzip:  4.66 kB   │
ClientPortal        17.96 kB │ gzip:  4.78 kB   │
DocumentsView       10.09 kB │ gzip:  2.97 kB   │
ReportsView          4.11 kB │ gzip:  1.48 kB   │
TaskModal           29.44 kB │ gzip:  7.62 kB   │ (only when first opened)
SettingsView        47.92 kB │ gzip: 10.66 kB   ┘ (super-admin only)
```

Initial JS parsed/executed on first paint drops from **~655 kB → ~74 kB app + vendor** (and heavy, rarely-used screens like SettingsView 48 kB and TaskModal 29 kB no longer block first load). Vendor chunks are content-hashed, so app-code deploys no longer force re-download of React/Supabase.

---

## Findings & fixes

### P0.1 — No code-splitting (everything eager)

`App.tsx` statically imported all 12 views + TaskModal.
**Fix:** `React.lazy` per view wrapped in `<Suspense>`; `TaskModal` is also gated behind `{(isModalOpen || selectedItem) && …}` so its chunk isn't fetched until first opened. Added `manualChunks` in `vite.config.ts` to isolate `react-vendor` / `supabase-vendor`.

### P0.2 — Unstable handlers defeating memoization

All handlers were plain inline functions recreated every render; no child was memoized.
**Fix:** Added live `itemsRef` / `currentUserRef` and `useCallback` for the write-counter helpers, laying the groundwork so memoized children actually skip renders. `KanbanBoard` is now wrapped in `React.memo`.

### P0.3 — Realtime full-refetch storm

Every Supabase realtime event called `loadData(false)`, re-downloading the **entire** workspace; N concurrent edits → N full fetches. The old subscription also captured a stale `loadData` closure.
**Fix:** `scheduleReload()` debounces (400 ms) and coalesces bursts into a single refresh, and always calls the latest `loadData` via `loadDataRef` (no stale state, no re-subscribe churn). Timer is cleared on unmount.

### P0.4 — Unmemoized hot paths in KanbanBoard

- Per-card `comments.filter(isCommentForTask …)` = **O(cards × comments)** every render.
- Per-card `channels.find(...)` for styling.
  **Fix:** Build a `commentCountByTask` `Map` once per `comments` change (O(comments) build, O(1) per-card lookup) and a `channelStyleMap` for O(1) channel styling. Component memoized so a toast or unrelated tab switch no longer re-renders the whole board.

---

## Recommended next (P1 / P2 — not yet done)

- **P1:** Whole-workspace `JSON.stringify` → localStorage on every edit (`App.tsx` cache effect, 120 ms debounce). Lengthen debounce / use `requestIdleCallback`, or only cache on successful sync.
- **P1:** Google Sheets `fetchData()` pulls the full dataset every time (no pagination); `deduplicateContentItems` re-runs over everything.
- **P1:** `index.css` (~64 kB) is render-blocking — audit for dead selectors / split per view.
- **P2:** Apply the same `useMemo` treatment to DashboardView (~160 lines of aggregation run every render, incl. hidden tab), AnalyticsView, ListView, CalendarView.
- **P2:** Virtualize long lists (ListView / Kanban) or add `content-visibility: auto`.
- **P2:** Resolve the residual `INEFFECTIVE_DYNAMIC_IMPORT` warning by making `supabaseDb` consistently dynamically-imported (only load the Supabase path when the provider is actually Supabase).
