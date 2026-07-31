#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

const DEFAULT_SCRIPT_URL =
  process.env.CONTENTLAB_API_URL ||
  process.env.VITE_GOOGLE_SHEETS_URL ||
  'https://script.google.com/macros/s/AKfycbxAvh-KXYqytNO7KgCBVCJAT2HAPC6X0MBrb6toUx9-zHOrxdalDkmp6oC1rkhVkyIFVQ/exec';

interface ContentItem {
  id: string;
  title: string;
  brief?: string;
  status?: string;
  channel?: string;
  format?: string;
  priority?: string;
  assignee?: string;
  publishDate?: string;
  assetsLink?: string;
  coverImageUrl?: string;
  tags?: string;
  budget?: string;
  platformNotes?: string;
  targetAudience?: string;
  createdBy?: string;
  checklist?: string;
  views?: string;
  likes?: string;
  engagement?: string;
  createdAt?: string;
  updatedAt?: string;
  taskType?: string;
  category?: string;
  dueDate?: string;
  client?: string;
  brand?: string;
}

// Fetch all workspace data from ContentLab Apps Script API
async function fetchWorkspaceData(): Promise<{ content: ContentItem[] }> {
  const response = await fetch(DEFAULT_SCRIPT_URL, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`ContentLab API GET error: ${response.statusText}`);
  }
  const data = (await response.json()) as { content?: ContentItem[] };
  return { content: data.content || [] };
}

// Post action to ContentLab Apps Script API
async function postWorkspaceAction(action: string, payload: Record<string, unknown>): Promise<any> {
  const bodyData = { action, ...payload };
  const response = await fetch(DEFAULT_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(bodyData),
  });
  if (!response.ok) {
    throw new Error(`ContentLab API POST error: ${response.statusText}`);
  }
  return await response.json();
}

// Helper: Normalize date string YYYY-MM-DD
function parseDateCell(raw: unknown): string {
  if (!raw) return '';
  const str = String(raw).trim();
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return str.split('T')[0];
}

// Create MCP Server
const server = new Server(
  {
    name: 'contentlab-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register MCP Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'contentlab_list_tasks',
        description: 'List, filter, and search content cards and general tasks in ContentLab Studio Planner.',
        inputSchema: {
          type: 'object',
          properties: {
            client: { type: 'string', description: 'Filter by client workspace name (e.g. "Akasia 365mc")' },
            brand: { type: 'string', description: 'Filter by brand' },
            status: { type: 'string', description: 'Filter by status ("Idea", "Scripting/Writing", "Production/Design", "Review/Editing", "Scheduled", "Published", "To Do", "In Progress", "Done")' },
            channel: { type: 'string', description: 'Filter by channel ("Instagram", "TikTok", "YouTube", "LinkedIn", etc.)' },
            taskType: { type: 'string', enum: ['Content', 'General'], description: 'Filter by task type' },
            search: { type: 'string', description: 'Search title, brief, or tags' },
          },
        },
      },
      {
        name: 'contentlab_get_task',
        description: 'Get detailed information for a single task card by ID or title.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Unique task ID or exact title' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'contentlab_create_task',
        description: 'Create a new content card or general task in ContentLab.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Task or content title' },
            brief: { type: 'string', description: 'Content brief or detailed description' },
            status: { type: 'string', description: 'Initial status (default: "Idea" for Content, "To Do" for General)' },
            channel: { type: 'string', description: 'Publishing channel (e.g. "Instagram", "TikTok", "YouTube")' },
            format: { type: 'string', description: 'Content format (e.g. "Feed/Reels", "Carousel", "Shorts", "Story")' },
            priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Urgent'], description: 'Task priority' },
            publishDate: { type: 'string', description: 'Planned publish date (YYYY-MM-DD)' },
            dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
            assetsLink: { type: 'string', description: 'Link to Google Drive, Figma, or shared assets' },
            coverImageUrl: { type: 'string', description: 'URL of the cover thumbnail image' },
            tags: { type: 'string', description: 'Comma-separated tags (e.g. "Reels, Campaign, Promo")' },
            client: { type: 'string', description: 'Client workspace name (e.g. "Akasia 365mc")' },
            brand: { type: 'string', description: 'Brand name' },
            taskType: { type: 'string', enum: ['Content', 'General'], description: 'Type of task (default: "Content")' },
            assignee: { type: 'string', description: 'Assigned PIC or team member name' },
            platformNotes: { type: 'string', description: 'Notes for caption, hashtags, or platform specs' },
            targetAudience: { type: 'string', description: 'Target audience details' },
            checklist: { type: 'string', description: 'Sub-tasks or checklist items' },
          },
          required: ['title'],
        },
      },
      {
        name: 'contentlab_update_task',
        description: 'Update any fields of an existing task card in ContentLab.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Unique task ID of the card to update' },
            title: { type: 'string', description: 'New title' },
            brief: { type: 'string', description: 'Updated content brief' },
            status: { type: 'string', description: 'Updated status' },
            channel: { type: 'string', description: 'Updated channel' },
            format: { type: 'string', description: 'Updated format' },
            priority: { type: 'string', description: 'Updated priority' },
            publishDate: { type: 'string', description: 'Updated publish date (YYYY-MM-DD)' },
            dueDate: { type: 'string', description: 'Updated due date (YYYY-MM-DD)' },
            assetsLink: { type: 'string', description: 'Updated Google Drive or asset URL' },
            coverImageUrl: { type: 'string', description: 'Updated cover image URL' },
            tags: { type: 'string', description: 'Updated tags' },
            client: { type: 'string', description: 'Updated client' },
            brand: { type: 'string', description: 'Updated brand' },
            assignee: { type: 'string', description: 'Updated assignee/PIC' },
            platformNotes: { type: 'string', description: 'Updated caption/platform notes' },
            targetAudience: { type: 'string', description: 'Updated target audience' },
            checklist: { type: 'string', description: 'Updated checklist' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'contentlab_update_status',
        description: 'Quickly change the status of a content card or task (e.g. move to Review/Editing, Scheduled, Published).',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Unique task ID' },
            status: {
              type: 'string',
              description: 'New status ("Idea", "Scripting/Writing", "Production/Design", "Review/Editing", "Scheduled", "Published", "To Do", "In Progress", "Done")',
            },
          },
          required: ['taskId', 'status'],
        },
      },
      {
        name: 'contentlab_fill_brief',
        description: 'Fill in or update the content brief, caption/platform notes, and target audience for a task.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Unique task ID' },
            brief: { type: 'string', description: 'Content copy, script, or detailed brief' },
            platformNotes: { type: 'string', description: 'Platform notes (caption, hashtags, audio notes)' },
            targetAudience: { type: 'string', description: 'Target audience description' },
          },
          required: ['taskId', 'brief'],
        },
      },
      {
        name: 'contentlab_attach_links',
        description: 'Attach or update shared asset links (Google Drive, Figma, Frame.io) and cover image URLs on a card.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Unique task ID' },
            assetsLink: { type: 'string', description: 'URL link to Google Drive, Figma, or shared folder' },
            coverImageUrl: { type: 'string', description: 'URL link to cover thumbnail image' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'contentlab_add_comment',
        description: 'Add a discussion comment or review feedback to a card with optional @mentions.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Unique task ID' },
            author: { type: 'string', description: 'Author name posting the comment (e.g. "Claude AI", "ChatGPT")' },
            text: { type: 'string', description: 'Comment text (use @Name to trigger email notifications to team members)' },
            attachmentUrl: { type: 'string', description: 'Optional attachment link' },
          },
          required: ['taskId', 'author', 'text'],
        },
      },
      {
        name: 'contentlab_delete_task',
        description: 'Delete a task card from ContentLab.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Unique task ID to delete' },
          },
          required: ['taskId'],
        },
      },
    ],
  };
});

// Tool Call Execution Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'contentlab_list_tasks') {
      const { content } = await fetchWorkspaceData();
      const client = (args?.client as string)?.toLowerCase();
      const brand = (args?.brand as string)?.toLowerCase();
      const status = (args?.status as string)?.toLowerCase();
      const channel = (args?.channel as string)?.toLowerCase();
      const taskType = (args?.taskType as string);
      const search = (args?.search as string)?.toLowerCase();

      const filtered = content.filter((item) => {
        if (client && (item.client || '').toLowerCase() !== client) return false;
        if (brand && (item.brand || '').toLowerCase() !== brand) return false;
        if (status && (item.status || '').toLowerCase() !== status) return false;
        if (channel && (item.channel || '').toLowerCase() !== channel) return false;
        if (taskType && item.taskType !== taskType) return false;
        if (search) {
          const haystack = `${item.title} ${item.brief || ''} ${item.tags || ''} ${item.brand || ''} ${item.client || ''}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                count: filtered.length,
                total: content.length,
                tasks: filtered.map((item) => ({
                  id: item.id,
                  title: item.title,
                  status: item.status,
                  channel: item.channel,
                  format: item.format,
                  publishDate: parseDateCell(item.publishDate),
                  dueDate: parseDateCell(item.dueDate),
                  assignee: item.assignee,
                  client: item.client,
                  brand: item.brand,
                  assetsLink: item.assetsLink,
                  coverImageUrl: item.coverImageUrl,
                  tags: item.tags,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'contentlab_get_task') {
      const taskId = String(args?.taskId || '').trim();
      const { content } = await fetchWorkspaceData();
      const item = content.find(
        (i) => i.id === taskId || i.title.toLowerCase() === taskId.toLowerCase()
      );

      if (!item) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Task with ID or title "${taskId}" not found.` }],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...item,
                publishDate: parseDateCell(item.publishDate),
                dueDate: parseDateCell(item.dueDate),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'contentlab_create_task') {
      const title = String(args?.title || '').trim();
      if (!title) throw new Error('Title is required');

      const newItem: Partial<ContentItem> = {
        title,
        brief: (args?.brief as string) || '',
        status: (args?.status as string) || 'Idea',
        channel: (args?.channel as string) || 'Instagram',
        format: (args?.format as string) || 'Feed/Reels',
        priority: (args?.priority as string) || 'Medium',
        publishDate: parseDateCell(args?.publishDate),
        dueDate: parseDateCell(args?.dueDate),
        assetsLink: (args?.assetsLink as string) || '',
        coverImageUrl: (args?.coverImageUrl as string) || '',
        tags: (args?.tags as string) || '',
        client: (args?.client as string) || '',
        brand: (args?.brand as string) || '',
        taskType: (args?.taskType as string) || 'Content',
        assignee: (args?.assignee as string) || '',
        platformNotes: (args?.platformNotes as string) || '',
        targetAudience: (args?.targetAudience as string) || '',
        checklist: (args?.checklist as string) || '',
        createdBy: 'AI Assistant (MCP)',
      };

      const result = await postWorkspaceAction('createContent', { item: newItem });
      return {
        content: [
          {
            type: 'text',
            text: `Successfully created task card "${title}"!\nResult: ${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    }

    if (name === 'contentlab_update_task') {
      const taskId = String(args?.taskId || '').trim();
      const { content } = await fetchWorkspaceData();
      const existing = content.find((i) => String(i.id).trim() === taskId);

      if (!existing) {
        throw new Error(`Task with ID "${taskId}" not found.`);
      }

      const updatedPayload: ContentItem = {
        ...existing,
        ...(args?.title ? { title: String(args.title) } : {}),
        ...(args?.brief !== undefined ? { brief: String(args.brief) } : {}),
        ...(args?.status ? { status: String(args.status) } : {}),
        ...(args?.channel ? { channel: String(args.channel) } : {}),
        ...(args?.format ? { format: String(args.format) } : {}),
        ...(args?.priority ? { priority: String(args.priority) } : {}),
        ...(args?.publishDate !== undefined ? { publishDate: parseDateCell(args.publishDate) } : {}),
        ...(args?.dueDate !== undefined ? { dueDate: parseDateCell(args.dueDate) } : {}),
        ...(args?.assetsLink !== undefined ? { assetsLink: String(args.assetsLink) } : {}),
        ...(args?.coverImageUrl !== undefined ? { coverImageUrl: String(args.coverImageUrl) } : {}),
        ...(args?.tags !== undefined ? { tags: String(args.tags) } : {}),
        ...(args?.client !== undefined ? { client: String(args.client) } : {}),
        ...(args?.brand !== undefined ? { brand: String(args.brand) } : {}),
        ...(args?.assignee !== undefined ? { assignee: String(args.assignee) } : {}),
        ...(args?.platformNotes !== undefined ? { platformNotes: String(args.platformNotes) } : {}),
        ...(args?.targetAudience !== undefined ? { targetAudience: String(args.targetAudience) } : {}),
        ...(args?.checklist !== undefined ? { checklist: String(args.checklist) } : {}),
        updatedAt: new Date().toISOString(),
      };

      const result = await postWorkspaceAction('updateContent', { item: updatedPayload });
      return {
        content: [
          {
            type: 'text',
            text: `Successfully updated task "${updatedPayload.title}"!\nResult: ${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    }

    if (name === 'contentlab_update_status') {
      const taskId = String(args?.taskId || '').trim();
      const status = String(args?.status || '').trim();

      const { content } = await fetchWorkspaceData();
      const existing = content.find((i) => String(i.id).trim() === taskId);

      if (!existing) {
        throw new Error(`Task with ID "${taskId}" not found.`);
      }

      const updatedPayload: ContentItem = {
        ...existing,
        status,
        updatedAt: new Date().toISOString(),
      };

      const result = await postWorkspaceAction('updateContent', { item: updatedPayload });
      return {
        content: [
          {
            type: 'text',
            text: `Status of "${existing.title}" successfully updated to "${status}"!\nResult: ${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    }

    if (name === 'contentlab_fill_brief') {
      const taskId = String(args?.taskId || '').trim();
      const brief = String(args?.brief || '').trim();

      const { content } = await fetchWorkspaceData();
      const existing = content.find((i) => String(i.id).trim() === taskId);

      if (!existing) {
        throw new Error(`Task with ID "${taskId}" not found.`);
      }

      const updatedPayload: ContentItem = {
        ...existing,
        brief,
        ...(args?.platformNotes !== undefined ? { platformNotes: String(args.platformNotes) } : {}),
        ...(args?.targetAudience !== undefined ? { targetAudience: String(args.targetAudience) } : {}),
        updatedAt: new Date().toISOString(),
      };

      const result = await postWorkspaceAction('updateContent', { item: updatedPayload });
      return {
        content: [
          {
            type: 'text',
            text: `Content brief for "${existing.title}" updated successfully!\nResult: ${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    }

    if (name === 'contentlab_attach_links') {
      const taskId = String(args?.taskId || '').trim();

      const { content } = await fetchWorkspaceData();
      const existing = content.find((i) => String(i.id).trim() === taskId);

      if (!existing) {
        throw new Error(`Task with ID "${taskId}" not found.`);
      }

      const updatedPayload: ContentItem = {
        ...existing,
        ...(args?.assetsLink !== undefined ? { assetsLink: String(args.assetsLink) } : {}),
        ...(args?.coverImageUrl !== undefined ? { coverImageUrl: String(args.coverImageUrl) } : {}),
        updatedAt: new Date().toISOString(),
      };

      const result = await postWorkspaceAction('updateContent', { item: updatedPayload });
      return {
        content: [
          {
            type: 'text',
            text: `Asset links & cover image for "${existing.title}" updated successfully!\nResult: ${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    }

    if (name === 'contentlab_add_comment') {
      const taskId = String(args?.taskId || '').trim();
      const author = String(args?.author || 'AI Assistant').trim();
      const text = String(args?.text || '').trim();
      const attachmentUrl = (args?.attachmentUrl as string) || undefined;

      const commentPayload = {
        contentId: taskId,
        author,
        text,
        attachmentUrl,
      };

      const result = await postWorkspaceAction('createComment', { comment: commentPayload });
      return {
        content: [
          {
            type: 'text',
            text: `Comment added to task successfully!\nResult: ${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    }

    if (name === 'contentlab_delete_task') {
      const taskId = String(args?.taskId || '').trim();
      const result = await postWorkspaceAction('deleteContent', { id: taskId });
      return {
        content: [
          {
            type: 'text',
            text: `Task ID "${taskId}" deleted successfully.\nResult: ${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool name: ${name}`);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${errMessage}`,
        },
      ],
    };
  }
});

// Start MCP Server over stdio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ContentLab MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error starting ContentLab MCP Server:', error);
  process.exit(1);
});
