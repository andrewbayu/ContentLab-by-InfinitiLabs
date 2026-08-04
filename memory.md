# 🧠 ContentLab Studio Planner - Continuity Memory File

> **Project Name**: ContentLab Studio Planner (by InfinitiLabs)  
> **Workspace Path**: `/Users/macbook/Documents/Works/InfinitiLabs/ContentLab-by-InfinitiLabs-2026-07-20`  
> **Repository**: `git@github.com:andrewbayu/ContentLab-by-InfinitiLabs.git`  
> **Last Updated**: 2026-08-03  


---

## 🚀 1. Tech Stack & Architecture Overview

- **Frontend**: React 18, TypeScript, Vite 8, Lucide React Icons.
- **Styling**: Modern Custom CSS with Dark/Light themes, Glassmorphism, Responsive Grid/Kanban/Calendar.
- **Dual Database Provider Support**:
  1. **Supabase PostgreSQL DB** (Primary engine with Realtime WebSockets & <50ms query performance).
  2. **Google Sheets / Apps Script Web App** (Backup / legacy spreadsheet engine).
- **Object Storage**: **Supabase Storage** (`contentLab-storage` bucket) for sub-second CDN cover image uploads.
- **AI Model Integration**: **Model Context Protocol (MCP) Server** for Claude Desktop, ChatGPT, Antigravity, and Cursor.

---

## 🔑 2. Key Credentials & Endpoints

### 🟢 Supabase Project Credentials
- **Project URL**: `https://jpjsycnbamvxnwmziedh.supabase.co`
- **Anon Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6ImpwanN5Y25iYW12eG53bXppZWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NjY1MDQsImV4cCI6MjA5OTE0MjUwNH0.zmVHpFUB0FDsGmvl5caB8e4uzBrvI_s3JgEgorv68WA`
- **Storage Bucket**: `contentLab-storage` (Public access for `/covers/*` assets)

### 📊 Google Apps Script Web App Endpoint
- **Web App URL**: `https://script.google.com/macros/s/AKfycbxAvh-KXYqytNO7KgCBVCJAT2HAPC6X0MBrb6toUx9-zHOrxdalDkmp6oC1rkhVkyIFVQ/exec`
- **Google Sheets ID**: Connected via Apps Script project.

---

## 🗄️ 3. Supabase Database Schema (8 Tables)

File: [`supabase/schema.sql`](file:///Users/macbook/Documents/Works/InfinitiLabs/ContentLab-by-InfinitiLabs-2026-07-20/supabase/schema.sql)

1. `client_brands` (`id UUID`, `client TEXT`, `brand TEXT`, `color TEXT`, `active BOOLEAN`)
2. `team_members` (`id UUID`, `name TEXT`, `email TEXT UNIQUE`, `password TEXT`, `role TEXT`, `client_access TEXT`, `avatar_url TEXT`)
3. `channels` (`id UUID`, `name TEXT UNIQUE`, `color TEXT`)
4. `tasks` (`id UUID`, `title TEXT`, `brief TEXT`, `status TEXT`, `channel TEXT`, `format TEXT`, `priority TEXT`, `assignee TEXT`, `owner_id UUID`, `reviewer_id UUID`, `collaborator_ids JSONB`, `publish_date TEXT`, `assets_link TEXT`, `cover_image_url TEXT`, `cover_image_id TEXT`, `tags TEXT`, `budget TEXT`, `platform_notes TEXT`, `target_audience TEXT`, `created_by TEXT`, `creator_id UUID`, `checklist JSONB`, `views TEXT`, `likes TEXT`, `engagement TEXT`, `task_type TEXT`, `category TEXT`, `due_date TEXT`, `client TEXT`, `brand TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`)
5. `comments` (`id UUID`, `task_id UUID REFERENCES tasks`, `author TEXT`, `author_id UUID`, `text TEXT`, `attachment_url TEXT`, `mentioned_user_ids JSONB`, `created_at TIMESTAMPTZ`)
6. `kpi_definitions` (`id UUID`, `client_brand_id UUID`, `client TEXT`, `brand TEXT`, `name TEXT`, `category TEXT`, `unit TEXT`, `baseline NUMERIC`, `target NUMERIC`, `direction TEXT`, `cadence TEXT`, `weight NUMERIC`, `active BOOLEAN`)
7. `kpi_updates` (`id UUID`, `kpi_id UUID REFERENCES kpi_definitions`, `period DATE`, `actual NUMERIC`, `notes TEXT`, `source_link TEXT`, `updated_by TEXT`, `updated_at TIMESTAMPTZ`)
8. `documents` (`id UUID`, `title TEXT`, `type TEXT`, `body TEXT`, `url TEXT`, `owner_id UUID`, `visibility TEXT`, `client TEXT`, `brand TEXT`, `task_id UUID`, `tags TEXT`, `pinned BOOLEAN`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`)

---

## 🛠️ 4. MCP Server Configuration (For AI Assistants)

Path Executable: [`mcp-server/dist/index.js`](file:///Users/macbook/Documents/Works/InfinitiLabs/ContentLab-by-InfinitiLabs-2026-07-20/mcp-server/dist/index.js)

### Available MCP Tools:
- `contentlab_list_tasks`
- `contentlab_get_task`
- `contentlab_create_task`
- `contentlab_update_task`
- `contentlab_update_status`
- `contentlab_fill_brief`
- `contentlab_attach_links`
- `contentlab_add_comment`
- `contentlab_delete_task`

### `claude_desktop_config.json` Snippet:
```json
{
  "mcpServers": {
    "contentlab": {
      "command": "node",
      "args": [
        "/Users/macbook/Documents/Works/InfinitiLabs/ContentLab-by-InfinitiLabs-2026-07-20/mcp-server/dist/index.js"
      ],
      "env": {
        "CONTENTLAB_API_URL": "https://script.google.com/macros/s/AKfycbxAvh-KXYqytNO7KgCBVCJAT2HAPC6X0MBrb6toUx9-zHOrxdalDkmp6oC1rkhVkyIFVQ/exec"
      }
    }
  }
}
```

---

## ⚙️ 5. Key Technical Fixes Completed

1. **Cover Image CDN & Disappearing Fix**:
   - `uploadCoverImageToSupabase` uploads directly to Supabase Object Storage bucket `contentLab-storage`.
   - `App.tsx` and `sheets.ts` preserve `coverImageUrl` during background sync so image URLs are never overwritten by empty server payloads.
   - Apps Script `writeContentItem_` guards against overwriting existing cover image cells in Google Sheets.
2. **Team Knowledge Document Visibility Fix**:
   - `sheets.ts` defaults unknown document visibility to `'team'`, ensuring documents created via API appear in the Team Workspace tab.
3. **1-Click 8-Table Supabase Migration Engine**:
   - Full migration of all 8 tables (`clients`, `channels`, `team`, `tasks`, `comments`, `kpiDefinitions`, `kpiUpdates`, `documents`).
   - Uses `toDeterministicUuid()` to map string IDs to valid Postgres UUIDs while preserving 100% of foreign key links.
   - `safeUpsertBatch()` handles batch upserts with row-by-row fallback.
4. **Task Deduplication Engine & Purge Button**:
   - `deduplicateContentItems()` automatically filters out duplicate task cards in React state by `id` and composite key `title::client::brand::publishDate`.
   - `purgeSupabaseDuplicateTasks()` and **`🧹 Hapus Task Ganda`** button in `SettingsView.tsx` purges duplicate rows from Supabase DB with 1 click.
5. **Comments Visibility on Cards (Sheets Fallback + UUID Matching)**:
   - `isCommentForTask()` matches comments to tasks via deterministic UUID + case-insensitive title matching.
   - `sheets.ts` provides a Google Sheets comments fallback when the Supabase `comments` table is empty.
   - Comment counter badges rendered on Kanban task cards (O(1) comment-count map).
6. **Performance P0 (commit `ba87ae2`)**:
   - `App.tsx`: `React.lazy` + `Suspense` for all views; `TaskModal` chunk lazy-loaded until opened.
   - `App.tsx`: debounced/coalesced realtime reload via `loadDataRef` (fixes N-fetch storm + stale closure).
   - `KanbanBoard.tsx`: O(1) comment-count + channel-style maps, wrapped in `React.memo`.
   - `vite.config.ts`: `manualChunks` for `react-vendor` / `supabase-vendor`. Bundle: 655kB monolith → 74kB shell + split chunks. See `PERF-AUDIT.md`.
7. **Supabase Client Repoint + Fetch Fallback (commit `64af57b`)**:
   - `supabase.ts` default client now points to active project `jpjsycnbamvxnwmziedh` (was `kfpbctylsnkvwmlugago`).
   - `supabaseDb.ts`: `fetchSupabaseInitialData()` falls back to Google Sheets (`fetchData()`) if `tasks`/`comments` fetch errors.

---

## 🔄 Git Sync Status (2026-08-03)

- Local rebased on top of remote `origin/main`. HEAD = `64af57b` (local fix) over `ba87ae2` (perf P0).
- `npm run build` passes (tsc type-check OK, Vite build ~401ms, code-splitting active).
- Local is **ahead 1** commit — pending `git push` to publish the Supabase client repoint + Sheets fallback fix.
- Untracked (not committed): `.env` (secrets — keep local), `src/documents.css`, `src/assets/{react,vite}.svg`.

---


## ⚡ 6. Quick Start & Verification Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build production bundle & verify TypeScript type checking
npm run build
```
