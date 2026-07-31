# ContentLab MCP Server

**Model Context Protocol (MCP) Server for ContentLab Studio Planner.**

This MCP server allows AI assistants (Claude Desktop, ChatGPT, Antigravity, Cursor, etc.) to directly manage content cards, briefs, statuses, assets links, cover images, and comments in ContentLab.

---

## 🛠️ Available MCP Tools

| MCP Tool Name | Description | Key Parameters |
| :--- | :--- | :--- |
| `contentlab_list_tasks` | List, search, & filter task cards | `client`, `brand`, `status`, `channel`, `search` |
| `contentlab_get_task` | Get detailed view of a single card | `taskId` (ID or Title) |
| `contentlab_create_task` | Create a new content card or task | `title`, `brief`, `channel`, `format`, `priority`, `publishDate`, `assetsLink`, `coverImageUrl`, `tags`, `client`, `brand` |
| `contentlab_update_task` | Update any properties on an existing card | `taskId`, `title`, `brief`, `status`, `channel`, `format`, `priority`, `publishDate`, `assetsLink`, `coverImageUrl`, `tags` |
| `contentlab_update_status` | Quick status change | `taskId`, `status` (`Idea`, `Scripting/Writing`, `Production/Design`, `Review/Editing`, `Scheduled`, `Published`, `To Do`, `In Progress`, `Done`) |
| `contentlab_fill_brief` | Fill or update brief & caption notes | `taskId`, `brief`, `platformNotes`, `targetAudience` |
| `contentlab_attach_links` | Attach Google Drive / Figma links or cover image | `taskId`, `assetsLink`, `coverImageUrl` |
| `contentlab_add_comment` | Post discussion comment with @mentions | `taskId`, `author`, `text`, `attachmentUrl` |
| `contentlab_delete_task` | Delete a task card | `taskId` |

---

## 🚀 Setup & Configuration Guide

### 1. Build the Server

Ensure dependencies are installed and the server is compiled:

```bash
cd mcp-server
npm install
npm run build
```

---

### 2. Configure in Claude Desktop

Add the following to your `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

### 3. Configure in Antigravity / Cursor

In Antigravity or Cursor MCP settings, add a Stdio MCP Server:

- **Name**: `contentlab`
- **Command**: `node`
- **Args**: `/Users/macbook/Documents/Works/InfinitiLabs/ContentLab-by-InfinitiLabs-2026-07-20/mcp-server/dist/index.js`
- **Environment Variables**:
  - `CONTENTLAB_API_URL`: `https://script.google.com/macros/s/AKfycbxAvh-KXYqytNO7KgCBVCJAT2HAPC6X0MBrb6toUx9-zHOrxdalDkmp6oC1rkhVkyIFVQ/exec`

---

## 💡 Example Prompts for Claude / ChatGPT / Antigravity

Once connected, you can ask your AI assistant:

- *"Show all content cards in ContentLab for Akasia 365mc."*
- *"Create a new Instagram Reels card titled '5 Tips Liposuction Modern' with status 'Idea' and publish date 2026-08-10."*
- *"Fill in the brief for card '5 Tips Liposuction Modern' and set status to 'Scripting/Writing'."*
- *"Attach this Google Drive link to card '5 Tips Liposuction Modern': https://drive.google.com/drive/folders/xyz"*
- *"Move card '5 Tips Liposuction Modern' to status 'Review/Editing' and add a comment tagging @Andrew."*
- *"Change status of '5 Tips Liposuction Modern' to 'Scheduled'."*
