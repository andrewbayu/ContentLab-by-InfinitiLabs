import React, { useState } from 'react';
import { getGlobalScriptUrl, getScriptUrl, hasLocalScriptUrlOverride, saveScriptUrl, validateScriptUrl } from '../services/sheets';
import { getGeneratedAvatar } from '../utils/avatar';
import type { TeamMember, Channel, VariablesConfig, ClientBrand, UserRole } from '../services/sheets';
import {
  Link,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  FileText,
  User,
  Tags,
  Sliders,
  Radio,
  Trash2,
  Plus,
  Building2,
  Pencil,
  X,
  Database,
  RefreshCw
} from 'lucide-react';
import { importGoogleSheetsToSupabase, isSupabaseDbConfigured, purgeSupabaseDuplicateTasks } from '../services/supabaseDb';
import { fetchData } from '../services/sheets';
import type { CommentItem, ContentItem, KpiDefinition, KpiUpdate, DocumentItem } from '../services/sheets';

interface SettingsViewProps {
  onConnectionChange: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  
  variablesConfig: VariablesConfig;
  onSaveVariablesConfig: (config: VariablesConfig) => void;
  
  tags: string[];
  onAddTag: (tag: string) => void;
  onDeleteTag: (tag: string) => void;
  
  team: TeamMember[];
  onAddCreator: (name: string, email: string, password: string, role: UserRole, client: string) => Promise<TeamMember>;
  onUpdateCreator: (member: TeamMember) => Promise<TeamMember>;
  onDeleteCreator: (id: string) => void;
  
  channels: Channel[];
  onAddChannel: (name: string, color: string) => Promise<Channel>;
  onDeleteChannel: (id: string) => void;
  clients: ClientBrand[];
  onAddClientBrand: (client: string, brand: string, color: string) => Promise<ClientBrand>;
  
  items?: ContentItem[];
  comments?: CommentItem[];
  kpiDefinitions?: KpiDefinition[];
  kpiUpdates?: KpiUpdate[];
  documents?: DocumentItem[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onConnectionChange,
  addToast,
  variablesConfig,
  onSaveVariablesConfig,
  tags,
  onAddTag,
  onDeleteTag,
  team,
  onAddCreator,
  onUpdateCreator,
  onDeleteCreator,
  channels,
  onAddChannel,
  onDeleteChannel,
  clients,
  onAddClientBrand,
  items = [],
  comments = [],
  kpiDefinitions = [],
  kpiUpdates = [],
  documents = []
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'variables' | 'tags' | 'team' | 'channels' | 'clients' | 'connection'>('variables');
  const [isImportingSupabase, setIsImportingSupabase] = useState(false);

  const handleSwitchProvider = (provider: 'sheets' | 'supabase') => {
    localStorage.setItem('contentlab_db_provider', provider);
    onConnectionChange();
    addToast(`Primary database switched to ${provider === 'supabase' ? 'Supabase Postgres' : 'Google Sheets'}.`, 'success');
  };

  const currentProvider = localStorage.getItem('contentlab_db_provider') === 'supabase' ? 'supabase' : 'sheets';

  const handleImportToSupabase = async () => {
    if (!isSupabaseDbConfigured()) {
      addToast('Supabase Client is not configured. Check VITE_SUPABASE_URL in .env.', 'error');
      return;
    }
    setIsImportingSupabase(true);
    addToast('Fetching fresh data from Google Sheets...', 'info');
    try {
      // ALWAYS fetch fresh data directly from Google Sheets regardless of current DB mode
      let freshData: any = null;
      try {
        // Temporarily clear supabase flag so fetchData() hits Google Sheets
        const prevProvider = localStorage.getItem('contentlab_db_provider');
        localStorage.removeItem('contentlab_db_provider');
        freshData = await fetchData();
        if (prevProvider) localStorage.setItem('contentlab_db_provider', prevProvider);
      } catch (fetchErr) {
        console.warn('Could not fetch from Google Sheets, using in-memory data:', fetchErr);
      }

      const dataToImport = freshData ?? {
        content: items,
        team,
        channels,
        clients,
        comments,
        kpiDefinitions,
        kpiUpdates,
        documents,
      };

      const totalItems =
        (dataToImport.content?.length || 0) +
        (dataToImport.team?.length || 0) +
        (dataToImport.channels?.length || 0) +
        (dataToImport.clients?.length || 0) +
        (dataToImport.comments?.length || 0) +
        (dataToImport.kpiDefinitions?.length || 0) +
        (dataToImport.kpiUpdates?.length || 0) +
        (dataToImport.documents?.length || 0);

      if (totalItems === 0) {
        addToast('Tidak ada data di Google Sheets untuk diimport. Pastikan koneksi Google Sheets sudah terkonfigurasi.', 'error');
        return;
      }

      addToast(`Mengimport ${totalItems} records (Tasks, Comments, KPIs, Team, Docs, Channels, Clients) ke Supabase...`, 'info');

      const res = await importGoogleSheetsToSupabase({
        content: dataToImport.content || [],
        team: dataToImport.team || [],
        channels: dataToImport.channels || [],
        clients: dataToImport.clients || [],
        comments: dataToImport.comments || [],
        kpiDefinitions: dataToImport.kpiDefinitions || [],
        kpiUpdates: dataToImport.kpiUpdates || [],
        documents: dataToImport.documents || [],
      });

      if (res.success) {
        const b = res.breakdown;
        const detailMsg = b
          ? `[Tasks: ${b.tasks}, Comments: ${b.comments}, KPIs: ${b.kpiDefinitions + b.kpiUpdates}, Docs: ${b.documents}, Team: ${b.team}, Channels: ${b.channels}, Clients: ${b.clients}]`
          : `${res.count} records`;

        addToast(`✅ ${res.message} ${detailMsg}`, 'success');
        localStorage.setItem('contentlab_db_provider', 'supabase');
        onConnectionChange();
      } else {
        addToast('Migration failed.', 'error');
      }
    } catch (e) {
      console.error(e);
      addToast(e instanceof Error ? e.message : 'Import failed', 'error');
    } finally {
      setIsImportingSupabase(false);
    }
  };

  const [isPurging, setIsPurging] = useState(false);

  const handlePurgeDuplicates = async () => {
    setIsPurging(true);
    try {
      addToast('Membersihkan data task ganda di database...', 'info');
      const res = await purgeSupabaseDuplicateTasks();
      if (res.deleted > 0) {
        addToast(`✅ Berhasil menghapus ${res.deleted} task ganda dari database!`, 'success');
      } else {
        addToast('✅ Tidak ditemukan task ganda di database.', 'info');
      }
      onConnectionChange();
    } catch (e) {
      addToast('Gagal membersihkan task ganda.', 'error');
    } finally {
      setIsPurging(false);
    }
  };
  
  // Connection state
  const [url, setUrl] = useState(getScriptUrl() || '');
  const [isValidating, setIsValidating] = useState(false);
  const [copied, setCopied] = useState(false);

  // New Tag form state
  const [newTag, setNewTag] = useState('');

  // New Creator form state
  const [creatorName, setCreatorName] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [creatorPassword, setCreatorPassword] = useState('');
  const [creatorRole, setCreatorRole] = useState<UserRole>('team');
  const [creatorClient, setCreatorClient] = useState('');
  const [isAddingCreator, setIsAddingCreator] = useState(false);

  // Edit member state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('team');
  const [editClient, setEditClient] = useState('');
  const [isSavingMember, setIsSavingMember] = useState(false);

  const handleStartEditMember = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditRole(member.role);
    setEditClient(member.client || '');
  };

  const handleCancelEditMember = () => {
    setEditingMemberId(null);
  };

  const handleSaveMemberEdit = async (member: TeamMember) => {
    if (!editName.trim() || !editEmail.trim()) return;
    setIsSavingMember(true);
    try {
      await onUpdateCreator({
        ...member,
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        client: editRole === 'super' ? '' : editClient,
      });
      setEditingMemberId(null);
    } finally {
      setIsSavingMember(false);
    }
  };

  // New Channel form state
  const [channelName, setChannelName] = useState('');
  const [channelColor, setChannelColor] = useState('#2563eb');
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [clientName, setClientName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandColor, setBrandColor] = useState('#2563eb');
  const [isAddingClientBrand, setIsAddingClientBrand] = useState(false);

  const currentUrl = getScriptUrl();
  const globalUrl = getGlobalScriptUrl();
  const hasLocalOverride = hasLocalScriptUrlOverride();

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      saveScriptUrl('');
      setUrl(globalUrl || '');
      onConnectionChange();
      addToast(globalUrl ? 'Using global Google Sheets connection.' : 'Disconnected from Google Sheets.', 'info');
      return;
    }

    setIsValidating(true);
    const valid = await validateScriptUrl(url);
    setIsValidating(false);

    if (valid) {
      saveScriptUrl(url);
      onConnectionChange();
      addToast('Successfully connected to Google Sheets!', 'success');
    } else {
      addToast('Could not validate connection. Please verify script deployment or CORS settings.', 'error');
    }
  };

  const handleDisconnect = () => {
    saveScriptUrl('');
    setUrl(globalUrl || '');
    onConnectionChange();
    addToast(globalUrl ? 'Browser override removed. Using global connection.' : 'Disconnected from Google Sheets.', 'info');
  };

  const handleVariableToggle = (key: keyof VariablesConfig) => {
    const updated = {
      ...variablesConfig,
      [key]: !variablesConfig[key]
    };
    onSaveVariablesConfig(updated);
    addToast(`Field "${key}" visibility updated!`, 'success');
  };

  const handleAddTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    const cleanTag = newTag.trim();
    if (tags.includes(cleanTag)) {
      addToast(`Tag "${cleanTag}" already exists!`, 'error');
      return;
    }
    onAddTag(cleanTag);
    setNewTag('');
    addToast(`Added custom tag "${cleanTag}"`, 'success');
  };

  const handleAddCreatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorName.trim() || !creatorEmail.trim() || !creatorPassword.trim() || (creatorRole === 'client' && !creatorClient)) return;
    setIsAddingCreator(true);
    try {
      await onAddCreator(creatorName.trim(), creatorEmail.trim(), creatorPassword, creatorRole, creatorRole === 'client' ? creatorClient : '');
      setCreatorName('');
      setCreatorEmail('');
      setCreatorPassword('');
      setCreatorRole('team');
      setCreatorClient('');
      addToast(`Successfully added creator "${creatorName}"`, 'success');
    } catch (e) {
      addToast('Failed to add crew member.', 'error');
    } finally {
      setIsAddingCreator(false);
    }
  };

  const handleAddChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;
    setIsAddingChannel(true);
    try {
      await onAddChannel(channelName.trim(), channelColor);
      setChannelName('');
      setChannelColor('#2563eb');
      addToast(`Successfully added channel "${channelName}"`, 'success');
    } catch (e) {
      addToast('Failed to add platform channel.', 'error');
    } finally {
      setIsAddingChannel(false);
    }
  };

  const handleAddClientBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !brandName.trim()) return;
    setIsAddingClientBrand(true);
    try {
      await onAddClientBrand(clientName.trim(), brandName.trim(), brandColor);
      setClientName('');
      setBrandName('');
      setBrandColor('#2563eb');
    } catch (error) {
      console.error(error);
    } finally {
      setIsAddingClientBrand(false);
    }
  };

  const copyScriptCode = () => {
    const code = `function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const content = getSheetData(sheet.getSheetByName("Content"));
  const team = getSheetData(sheet.getSheetByName("Team"));
  const channels = getSheetData(sheet.getSheetByName("Channels"));
  const comments = getSheetData(sheet.getSheetByName("Comments"));
  const clients = getSheetData(sheet.getSheetByName("Clients"));
  const kpiDefinitions = getSheetData(sheet.getSheetByName("KPI Definitions"));
  const kpiUpdates = getSheetData(sheet.getSheetByName("KPI Updates"));
  const taskMembers = getSheetData(sheet.getSheetByName("Task Members"));
  const publicTeam = team.map(function(member) {
    return {
      id: member.id,
      name: member.name,
      email: member.email,
      avatar: member.avatar,
      role: String(member.role || "team").toLowerCase() === "super" ? "super" : "team"
    };
  });
  
  const payload = {
    content: content,
    team: publicTeam,
    channels: channels,
    comments: comments,
    clients: clients,
    kpiDefinitions: kpiDefinitions,
    kpiUpdates: kpiUpdates,
    taskMembers: taskMembers
  };
  
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    
    let result = { success: false };
    
    if (action === "createContent") {
      const contentSheet = sheet.getSheetByName("Content");
      const item = postData.item;
      item.id = item.id || generateUuid();
      item.createdAt = new Date().toISOString();
      item.updatedAt = new Date().toISOString();
      
      contentSheet.appendRow([
        item.id, item.title, item.brief, item.status, 
        item.channel, item.format, item.priority, item.assignee, item.publishDate,
        item.assetsLink, item.tags || "", item.budget || "", item.platformNotes || "", 
        item.targetAudience || "", item.createdBy || "", item.checklist || "",
        item.views || "", item.likes || "", item.engagement || "",
        item.createdAt, item.updatedAt, item.taskType || "Content", item.category || "",
        item.dueDate || "", item.client || "", item.brand || ""
      ]);
      syncTaskMembers(sheet, item, true);
      result = { success: true, item: item };
    } 
    else if (action === "updateContent") {
      const contentSheet = sheet.getSheetByName("Content");
      const item = postData.item;
      
      const data = contentSheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === item.id) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex !== -1) {
        item.createdBy = data[rowIndex - 1][14] || item.createdBy || "";
        item.createdAt = data[rowIndex - 1][19] || item.createdAt;
        contentSheet.getRange(rowIndex, 1, 1, 26).setValues([[
          item.id, item.title, item.brief, item.status, 
          item.channel, item.format, item.priority, item.assignee, item.publishDate,
          item.assetsLink, item.tags || "", item.budget || "", item.platformNotes || "", 
          item.targetAudience || "", item.createdBy || "", item.checklist || "",
          item.views || "", item.likes || "", item.engagement || "",
          item.createdAt, item.updatedAt, item.taskType || "Content", item.category || "",
          item.dueDate || "", item.client || "", item.brand || ""
        ]]);
        syncTaskMembers(sheet, item, false);
        result = { success: true, item: item };
      } else {
        result = { success: false, error: "Content item not found" };
      }
    }
    else if (action === "deleteContent") {
      const contentSheet = sheet.getSheetByName("Content");
      const itemId = postData.id;
      const data = contentSheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === itemId) {
          rowIndex = i + 1;
          break;
        }
      }
      if (rowIndex !== -1) {
        contentSheet.deleteRow(rowIndex);
        deleteTaskMembers(sheet, itemId);
        result = { success: true };
      } else {
        result = { success: false, error: "Content item not found" };
      }
    }
    else if (action === "createTeamMember") {
      const teamSheet = sheet.getSheetByName("Team");
      const member = postData.member;
      teamSheet.appendRow([
        member.id, member.name, member.email, member.avatar,
        member.password || "", member.role || "team"
      ]);
      result = { success: true, member: member };
    }
    else if (action === "createChannel") {
      const channelSheet = sheet.getSheetByName("Channels");
      const channel = postData.channel;
      channelSheet.appendRow([
        channel.id, channel.name, channel.color
      ]);
      result = { success: true, channel: channel };
    }
    else if (action === "createClientBrand") {
      const clientsSheet = sheet.getSheetByName("Clients");
      const clientBrand = postData.clientBrand;
      clientsSheet.appendRow([
        clientBrand.id, clientBrand.client, clientBrand.brand,
        clientBrand.color || "#2563eb", clientBrand.active !== false
      ]);
      result = { success: true, clientBrand: clientBrand };
    }
    else if (action === "createKpiDefinition") {
      const kpiSheet = sheet.getSheetByName("KPI Definitions");
      const definition = postData.definition;
      definition.id = definition.id || generateUuid();
      definition.createdAt = definition.createdAt || new Date().toISOString();
      kpiSheet.appendRow([
        definition.id, definition.clientBrandId, definition.client, definition.brand,
        definition.name, definition.category || "Business", definition.unit || "Number",
        Number(definition.baseline || 0), Number(definition.target || 0),
        definition.direction || "increase", definition.cadence || "Monthly",
        Number(definition.weight || 1), definition.active !== false, definition.createdAt
      ]);
      result = { success: true, definition: definition };
    }
    else if (action === "createKpiUpdate") {
      const updateSheet = sheet.getSheetByName("KPI Updates");
      const update = postData.update;
      update.id = update.id || generateUuid();
      update.updatedAt = new Date().toISOString();
      updateSheet.appendRow([
        update.id, update.kpiId, update.period, Number(update.actual || 0),
        update.notes || "", update.sourceLink || "", update.updatedBy || "", update.updatedAt
      ]);
      result = { success: true, update: update };
    }
    else if (action === "createComment") {
      const commentSheet = sheet.getSheetByName("Comments");
      const comment = postData.comment;
      comment.id = generateUuid();
      comment.createdAt = new Date().toISOString();
      
      commentSheet.appendRow([
        comment.id, comment.contentId, comment.author, comment.text, comment.createdAt
      ]);
      
      // EMAIL NOTIFICATION FOR @MENTIONS
      try {
        const text = comment.text;
        if (text.includes("@")) {
          const teamSheet = sheet.getSheetByName("Team");
          const teamData = getSheetData(teamSheet);
          const contentSheet = sheet.getSheetByName("Content");
          const contentData = getSheetData(contentSheet);
          
          let contentTitle = "Content Plan";
          for (let i = 0; i < contentData.length; i++) {
            if (String(contentData[i].id) === String(comment.contentId)) {
              contentTitle = contentData[i].title;
              break;
            }
          }
          
          for (let i = 0; i < teamData.length; i++) {
            const member = teamData[i];
            if (text.includes("@" + member.name)) {
              if (member.email) {
                const subject = "[ContentLab] Mentions from " + comment.author + " on \\\"" + contentTitle + "\\\"";
                const body = "Halo " + member.name + ",\\n\\n" +
                             comment.author + " menyebut Anda dalam diskusi revisi untuk \\\"" + contentTitle + "\\\":\\n\\n" +
                             "\\\"" + text + "\\\"\\n\\n" +
                             "Silakan cek ContentLab Studio Planner Anda.";
                MailApp.sendEmail(member.email, subject, body);
              }
            }
          }
        }
      } catch (mailErr) {
        console.error("Mail error log:", mailErr);
      }
      
      result = { success: true, comment: comment };    
    } else if (action === "login") {
      const teamSheet = sheet.getSheetByName("Team");
      const teamData = getSheetData(teamSheet);
      const username = postData.username.trim().toLowerCase();
      const password = String(postData.password).trim();
      
      let matchedUser = null;
      for (let i = 0; i < teamData.length; i++) {
        const member = teamData[i];
        const memberName = String(member.name || "").trim().toLowerCase();
        const memberEmail = String(member.email || "").trim().toLowerCase();
        const memberPassword = String(member.password || "").trim();
        
        if ((memberName === username || memberEmail === username) && memberPassword === password) {
          matchedUser = {
            id: member.id,
            name: member.name,
            email: member.email,
            avatar: member.avatar,
            role: String(member.role || "team").toLowerCase() === "super" ? "super" : "team"
          };
          break;
        }
      }
      
      if (matchedUser) {
        result = { success: true, user: matchedUser };
      } else {
        result = { success: false, error: "Username atau password salah" };
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetData(sheet) {
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length <= 1) return [];
  
  // Trim headers to prevent trailing space header mismatch
  const headers = values[0].map(function(h) { return String(h).trim(); });
  const data = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[i][j];
    }
    data.push(row);
  }
  return data;
}

function syncTaskMembers(spreadsheet, item, isCreate) {
  const memberSheet = spreadsheet.getSheetByName("Task Members");
  if (!memberSheet) return;

  const values = memberSheet.getDataRange().getValues();
  let hasCreator = false;
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][1]) !== String(item.id)) continue;
    if (!isCreate && String(values[i][3]) === "creator") {
      hasCreator = true;
      continue;
    }
    memberSheet.deleteRow(i + 1);
  }

  const actorId = item.actorId || item.creatorId || "";
  const now = new Date().toISOString();
  if ((!hasCreator || isCreate) && item.creatorId) {
    appendTaskMember(memberSheet, item.id, item.creatorId, "creator", now, actorId);
  }
  if (item.ownerId) {
    appendTaskMember(memberSheet, item.id, item.ownerId, "owner", now, actorId);
  }

  const collaborators = Array.isArray(item.collaboratorIds) ? item.collaboratorIds : [];
  const seen = {};
  for (let i = 0; i < collaborators.length; i++) {
    const userId = String(collaborators[i] || "");
    if (!userId || userId === String(item.ownerId || "") || userId === String(item.reviewerId || "") || seen[userId]) continue;
    seen[userId] = true;
    appendTaskMember(memberSheet, item.id, userId, "collaborator", now, actorId);
  }

  if (item.reviewerId && String(item.reviewerId) !== String(item.ownerId || "")) {
    appendTaskMember(memberSheet, item.id, item.reviewerId, "reviewer", now, actorId);
  }
}

function appendTaskMember(memberSheet, taskId, userId, role, addedAt, addedBy) {
  memberSheet.appendRow([
    generateUuid(), taskId, userId, role, addedAt, addedBy || ""
  ]);
}

function deleteTaskMembers(spreadsheet, taskId) {
  const memberSheet = spreadsheet.getSheetByName("Task Members");
  if (!memberSheet) return;
  const values = memberSheet.getDataRange().getValues();
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][1]) === String(taskId)) memberSheet.deleteRow(i + 1);
  }
}`;

    navigator.clipboard.writeText(code);
    setCopied(true);
    addToast('Apps Script code copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-container">
      <div className="settings-layout">
        {/* Settings Subnav Menu */}
        <div className="settings-nav-sidebar">
          <button
            className={`settings-nav-item ${activeSubTab === 'variables' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('variables')}
          >
            <Sliders size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Extra Variables
          </button>
          <button
            className={`settings-nav-item ${activeSubTab === 'tags' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('tags')}
          >
            <Tags size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Custom Tags
          </button>
          <button
            className={`settings-nav-item ${activeSubTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('team')}
          >
            <User size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Team Members
          </button>
          <button
            className={`settings-nav-item ${activeSubTab === 'channels' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('channels')}
          >
            <Radio size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Publish Channels
          </button>
          <button
            className={`settings-nav-item ${activeSubTab === 'clients' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('clients')}
          >
            <Building2 size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Clients & Brands
          </button>
          <button
            className={`settings-nav-item ${activeSubTab === 'connection' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('connection')}
          >
            <Link size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Sheets Connection
          </button>
        </div>

        {/* Settings Active Panel */}
        <div className="settings-section-panel">
          
          {/* EXTRA VARIABLES TAB */}
          {activeSubTab === 'variables' && (
            <div className="insight-panel">
              <div className="insight-header">
                <h3 className="insight-title">Extra Variables Toggle</h3>
              </div>
              <p className="text-secondary" style={{ fontSize: '13px', lineHeight: 1.5 }}>
                Tentukan variabel opsional yang ingin Anda gunakan pada form perencanaan konten. Kolom inti bawaan seperti <em>Title, Channel, Format, Status, Priority, Assignee, dan Assets Link</em> wajib selalu aktif.
              </p>
              
              <div className="variable-toggle-list">
                {/* Default Required variables (disabled switches) */}
                <div className="variable-toggle-row" style={{ opacity: 0.7 }}>
                  <div className="variable-toggle-info">
                    <span className="variable-title">Content Title, Status, Priority</span>
                    <span className="variable-description">Informasi inti wajib untuk mengidentifikasi konten dan tahapan produksinya.</span>
                  </div>
                  <label className="switch-control">
                    <input type="checkbox" checked disabled />
                    <span className="switch-slider" />
                  </label>
                </div>

                <div className="variable-toggle-row" style={{ opacity: 0.7 }}>
                  <div className="variable-toggle-info">
                    <span className="variable-title">Channel & Format & Assignee</span>
                    <span className="variable-description">Platform tujuan posting, tipe visualisasi media, dan penanggung jawab crew.</span>
                  </div>
                  <label className="switch-control">
                    <input type="checkbox" checked disabled />
                    <span className="switch-slider" />
                  </label>
                </div>

                {/* Togglable variables */}
                <div className="variable-toggle-row">
                  <div className="variable-toggle-info">
                    <span className="variable-title">Content Brief & Description (Description)</span>
                    <span className="variable-description">Kolom text area untuk menulis ringkasan ide, outline script, atau brief visual.</span>
                  </div>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={variablesConfig.brief}
                      onChange={() => handleVariableToggle('brief')}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>

                <div className="variable-toggle-row">
                  <div className="variable-toggle-info">
                    <span className="variable-title">Target Publish Date</span>
                    <span className="variable-description">Tanggal target tayang konten untuk menyusun timeline antrean.</span>
                  </div>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={variablesConfig.publishDate}
                      onChange={() => handleVariableToggle('publishDate')}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>

                <div className="variable-toggle-row">
                  <div className="variable-toggle-info">
                    <span className="variable-title">Custom Tags List</span>
                    <span className="variable-description">Label kategori khusus untuk mempermudah grouping tipe kampanye pemasaran (misal: Promo, Sponsor).</span>
                  </div>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={variablesConfig.tags}
                      onChange={() => handleVariableToggle('tags')}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>

                <div className="variable-toggle-row">
                  <div className="variable-toggle-info">
                    <span className="variable-title">Budget / Estimated Cost</span>
                    <span className="variable-description">Mencatat anggaran pengeluaran produksi (seperti biaya ads, talent, atau editor).</span>
                  </div>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={variablesConfig.budget}
                      onChange={() => handleVariableToggle('budget')}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>

                <div className="variable-toggle-row">
                  <div className="variable-toggle-info">
                    <span className="variable-title">Platform Notes & Caption Drafts</span>
                    <span className="variable-description">Kolom khusus untuk merancang copywriting caption, hashtag, atau draf tweet.</span>
                  </div>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={variablesConfig.platformNotes}
                      onChange={() => handleVariableToggle('platformNotes')}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>

                <div className="variable-toggle-row">
                  <div className="variable-toggle-info">
                    <span className="variable-title">Target Audience Personas</span>
                    <span className="variable-description">Menulis profil penonton sasaran utama konten ini agar isi pesan lebih fokus.</span>
                  </div>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={variablesConfig.targetAudience}
                      onChange={() => handleVariableToggle('targetAudience')}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* CUSTOM TAGS TAB */}
          {activeSubTab === 'tags' && (
            <div className="insight-panel">
              <div className="insight-header">
                <h3 className="insight-title">Custom Tags Management</h3>
              </div>
              <p className="text-secondary" style={{ fontSize: '13px' }}>
                Tambahkan label tag khusus untuk memperkaya kategori plan konten Anda.
              </p>

              <div className="registry-list">
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <div key={tag} className="registry-pill">
                      <span>{tag}</span>
                      <button className="registry-delete-btn" onClick={() => onDeleteTag(tag)} title={`Delete tag ${tag}`}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-muted" style={{ fontSize: '13px' }}>Belum ada tag kustom yang terdaftar.</span>
                )}
              </div>

              <form onSubmit={handleAddTagSubmit} style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tambahkan tag baru (misal: Sponsored, Event)..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  style={{ maxWidth: '300px' }}
                />
                <button type="submit" className="btn btn-primary">
                  <Plus size={14} />
                  Add Tag
                </button>
              </form>
            </div>
          )}

          {/* TEAM TAB */}
          {activeSubTab === 'team' && (
            <div className="insight-panel">
              <div className="insight-header">
                <h3 className="insight-title">Crew & Team Registry</h3>
              </div>
              <p className="text-secondary" style={{ fontSize: '13px' }}>
                Daftar anggota tim/kreator yang berwenang memproduksi konten planner.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {team.map((member) => {
                  const isEditing = editingMemberId === member.id;
                  return (
                    <div key={member.id} style={{ padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: isEditing ? '#f8fafc' : '#ffffff' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Name</label>
                              <input
                                type="text"
                                className="form-input"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                style={{ width: '100%' }}
                                required
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Email</label>
                              <input
                                type="email"
                                className="form-input"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                style={{ width: '100%' }}
                                required
                              />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Role</label>
                              <select
                                className="form-select"
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value as UserRole)}
                                style={{ width: '100%' }}
                              >
                                <option value="team">Team Member</option>
                                <option value="client">Client</option>
                                <option value="super">Super Admin</option>
                              </select>
                            </div>
                            {editRole !== 'super' && (
                              <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Client Access</label>
                                <select
                                  className="form-select"
                                  value={editClient}
                                  onChange={(e) => setEditClient(e.target.value)}
                                  style={{ width: '100%' }}
                                  required={editRole === 'client'}
                                >
                                  <option value="">{editRole === 'client' ? 'Assign Client *' : 'All Clients (Default)'}</option>
                                  {[...new Set(clients.filter((entry) => entry.active).map((entry) => entry.client))].sort().map((client) => (
                                    <option key={client} value={client}>{client}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                              onClick={handleCancelEditMember}
                              disabled={isSavingMember}
                            >
                              <X size={13} /> Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: '4px 12px', fontSize: '12px' }}
                              onClick={() => handleSaveMemberEdit(member)}
                              disabled={isSavingMember || !editName.trim() || !editEmail.trim()}
                            >
                              <Check size={13} /> {isSavingMember ? 'Saving...' : 'Save Access'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src={getGeneratedAvatar(member.name)} alt={member.name} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }} />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600, fontSize: '14px' }}>{member.name}</span>
                                <span className={`team-role-badge role-${member.role}`}>{member.role === 'super' ? 'Super Admin' : member.role === 'client' ? 'Client' : 'Team Member'}</span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {member.email} · <strong style={{ color: '#2563eb' }}>{member.client ? `Access: ${member.client}` : 'Access: All Clients'}</strong>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              className="btn btn-secondary btn-icon-only"
                              style={{ padding: '6px' }}
                              onClick={() => handleStartEditMember(member)}
                              title="Edit Member & Access Permissions"
                            >
                              <Pencil size={14} style={{ color: '#3b82f6' }} />
                            </button>
                            <button
                              className="btn btn-secondary btn-icon-only"
                              style={{ padding: '6px' }}
                              onClick={() => onDeleteCreator(member.id)}
                              title="Delete Member"
                            >
                              <Trash2 size={14} style={{ color: '#dc2626' }} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleAddCreatorSubmit} className="team-member-form">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Creator Name *"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  required
                />
                <input
                  type="email"
                  className="form-input"
                  placeholder="Email Address *"
                  value={creatorEmail}
                  onChange={(e) => setCreatorEmail(e.target.value)}
                  required
                />
                <input type="password" className="form-input" placeholder="Temporary Password *" value={creatorPassword} onChange={(e) => setCreatorPassword(e.target.value)} minLength={8} required />
                <select className="form-select" value={creatorRole} onChange={(e) => { const role = e.target.value as UserRole; setCreatorRole(role); }} aria-label="User role">
                  <option value="team">Team Member</option>
                  <option value="client">Client</option>
                  <option value="super">Super Admin</option>
                </select>
                {creatorRole !== 'super' && (
                  <select className="form-select" value={creatorClient} onChange={(e) => setCreatorClient(e.target.value)} aria-label="Assign client" required={creatorRole === 'client'}>
                    <option value="">{creatorRole === 'client' ? 'Assign Client *' : 'Client Access: All Clients (Default)'}</option>
                    {[...new Set(clients.filter((entry) => entry.active).map((entry) => entry.client))].sort().map((client) => (
                      <option key={client} value={client}>{client}</option>
                    ))}
                  </select>
                )}
                <button type="submit" className="btn btn-primary" disabled={isAddingCreator}>
                  {isAddingCreator ? 'Saving...' : 'Add User'}
                </button>
              </form>
            </div>
          )}

          {/* CHANNELS TAB */}
          {activeSubTab === 'channels' && (
            <div className="insight-panel">
              <div className="insight-header">
                <h3 className="insight-title">Publish Channels</h3>
              </div>
              <p className="text-secondary" style={{ fontSize: '13px' }}>
                Saluran atau platform media sosial tujuan publikasi beserta warna penanda.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {channels.map((ch) => (
                  <div key={ch.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: ch.color }} />
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{ch.name}</span>
                    </div>
                    <button className="btn btn-secondary btn-icon-only" style={{ border: 'none', padding: '4px' }} onClick={() => onDeleteChannel(ch.id)}>
                      <Trash2 size={14} style={{ color: '#dc2626' }} />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddChannelSubmit} style={{ display: 'flex', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Channel Name (e.g. Threads) *"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  required
                />
                <input
                  type="color"
                  value={channelColor}
                  onChange={(e) => setChannelColor(e.target.value)}
                  style={{ width: '40px', height: '40px', padding: '0', border: '1px solid var(--border-strong)', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
                />
                <button type="submit" className="btn btn-primary" disabled={isAddingChannel}>
                  {isAddingChannel ? 'Saving...' : 'Add Channel'}
                </button>
              </form>
            </div>
          )}

          {/* CLIENTS & BRANDS TAB */}
          {activeSubTab === 'clients' && (
            <div className="insight-panel">
              <div className="insight-header">
                <h3 className="insight-title">Clients & Brands</h3>
              </div>
              <p className="text-secondary" style={{ fontSize: '13px' }}>
                Registry ini menjadi scope utama untuk Overview, task views, Calendar, dan Analytics.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                {clients.map((entry) => (
                  <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                    <span style={{ width: '12px', height: '34px', borderRadius: '5px', backgroundColor: entry.color }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: '13px' }}>{entry.brand}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{entry.client} · {entry.active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                ))}
                {clients.length === 0 && <div className="text-secondary" style={{ fontSize: '13px' }}>No client or brand registered yet.</div>}
              </div>

              <form onSubmit={handleAddClientBrandSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 46px auto', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', alignItems: 'center' }}>
                <input className="form-input" placeholder="Client name *" value={clientName} onChange={(event) => setClientName(event.target.value)} required />
                <input className="form-input" placeholder="Brand name *" value={brandName} onChange={(event) => setBrandName(event.target.value)} required />
                <input type="color" value={brandColor} onChange={(event) => setBrandColor(event.target.value)} style={{ width: '42px', height: '42px', padding: 0, border: '1px solid var(--border-strong)', borderRadius: '6px' }} />
                <button type="submit" className="btn btn-primary" disabled={isAddingClientBrand}>{isAddingClientBrand ? 'Saving...' : 'Add Client / Brand'}</button>
              </form>
            </div>
          )}

          {/* CONNECTION TAB */}
          {activeSubTab === 'connection' && (
            <>
              {/* SUPABASE DATABASE & MIGRATION PANEL */}
              <div className="insight-panel" style={{ gap: '16px', border: '1px solid #3b82f6', background: '#f0f9ff' }}>
                <h3 className="insight-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1d4ed8' }}>
                  <Database size={20} style={{ color: '#2563eb' }} />
                  <span>Supabase Postgres Database Engine (Recommended)</span>
                </h3>

                <p style={{ fontSize: '13px', color: '#334155' }}>
                  Gunakan Supabase PostgreSQL sebagai database utama aplikasi untuk performa super cepat (&lt;50ms), real-time collaboration, dan bebas dari kuota request Google Sheets.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px 16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                      Status Database: <span style={{ color: isSupabaseDbConfigured() ? '#16a34a' : '#d97706' }}>{isSupabaseDbConfigured() ? 'Connected & Ready' : 'Configuration Missing'}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Primary Database Mode: <strong>{localStorage.getItem('contentlab_db_provider') === 'supabase' ? 'Supabase Postgres (Active)' : 'Google Sheets Mode'}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn ${currentProvider === 'sheets' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '12px', padding: '8px 12px' }}
                      onClick={() => handleSwitchProvider('sheets')}
                    >
                      {currentProvider === 'sheets' ? '✓ Active: Google Sheets' : 'Switch to Google Sheets'}
                    </button>

                    <button
                      type="button"
                      className={`btn ${currentProvider === 'supabase' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '12px', padding: '8px 12px' }}
                      onClick={() => handleSwitchProvider('supabase')}
                    >
                      {currentProvider === 'supabase' ? '✓ Active: Supabase' : 'Switch to Supabase'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px' }}
                      onClick={handleImportToSupabase}
                      disabled={isImportingSupabase || !isSupabaseDbConfigured()}
                    >
                      <RefreshCw size={14} className={isImportingSupabase ? 'spin' : ''} />
                      {isImportingSupabase ? 'Importing...' : '1-Click Import -> Supabase'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px', color: '#dc2626', borderColor: '#fca5a5', background: '#fff5f5' }}
                      onClick={handlePurgeDuplicates}
                      disabled={isPurging}
                    >
                      <Trash2 size={14} className={isPurging ? 'spin' : ''} />
                      {isPurging ? 'Cleaning...' : '🧹 Hapus Task Ganda'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="insight-panel" style={{ gap: '16px' }}>
                <h3 className="insight-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Link size={18} className="text-secondary" />
                  <span>Google Sheets Connection Status</span>
                </h3>

                {currentUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'rgba(22, 163, 74, 0.06)', border: '1px solid rgba(22, 163, 74, 0.2)', borderRadius: '6px' }}>
                    <CheckCircle size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ fontWeight: 600, color: '#16a34a', fontSize: '14px' }}>
                        {hasLocalOverride ? 'Connected using browser override' : 'Connected using global workspace configuration'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', wordBreak: 'break-all', fontFamily: 'monospace' }}>{currentUrl}</div>
                    </div>
                    {hasLocalOverride && (
                      <button className="btn btn-secondary" onClick={handleDisconnect}>
                        Reset to Global
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'rgba(217, 119, 6, 0.06)', border: '1px solid rgba(217, 119, 6, 0.2)', borderRadius: '6px' }}>
                    <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0 }} />
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ fontWeight: 600, color: '#d97706', fontSize: '14px' }}>Google Sheets Not Connected</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        All actions are saved in your local browser sandbox. Link your spreadsheet script below to save to your sheet in real time.
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSaveConnection} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                  <div className="form-group">
                    <label className="form-label">Optional Browser Override</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                    <span className="form-help">Kosongkan untuk memakai konfigurasi global. Override hanya berlaku pada browser ini.</span>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={isValidating}>
                    {isValidating ? 'Validating Connection...' : 'Save Override'}
                  </button>
                </form>
              </div>

              {/* Setup Instructions */}
              <div className="insight-panel" style={{ gap: '20px' }}>
                <h3 className="insight-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={18} className="text-secondary" />
                  <span>Step-by-Step Setup Guide (1 Minute)</span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px', lineHeight: 1.6 }}>
                  <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                    <strong>1. Configure Google Sheets Tabs:</strong>
                    <p className="text-secondary" style={{ fontSize: '13px', marginTop: '4px' }}>
                      Buka spreadsheet Anda dan buat 8 tab dengan judul persis berikut:
                    </p>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '24px', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      <li>
                        Nama tab: <strong style={{ color: 'var(--text-primary)' }}>Content</strong>
                        <br />
                        Tulis header berikut di baris pertama (kolom A-Z):
                        <div style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg-app)', padding: '6px', borderRadius: '4px', marginTop: '4px', color: 'var(--primary)', fontSize: '11px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                          id | title | brief | status | channel | format | priority | assignee | publishDate | assetsLink | tags | budget | platformNotes | targetAudience | createdBy | checklist | views | likes | engagement | createdAt | updatedAt | taskType | category | dueDate | client | brand
                        </div>
                      </li>
                      <li style={{ marginTop: '10px' }}>
                        Nama tab: <strong style={{ color: 'var(--text-primary)' }}>Team</strong>
                        <br />
                        Tulis header berikut di baris pertama (kolom A-F):
                        <div style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg-app)', padding: '6px', borderRadius: '4px', marginTop: '4px', color: 'var(--primary)' }}>
                          id | name | email | avatar | password | role
                        </div>
                      </li>
                      <li style={{ marginTop: '10px' }}>
                        Nama tab: <strong style={{ color: 'var(--text-primary)' }}>Clients</strong>
                        <br />
                        Tulis header berikut di baris pertama (kolom A-E):
                        <div style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg-app)', padding: '6px', borderRadius: '4px', marginTop: '4px', color: 'var(--primary)' }}>
                          id | client | brand | color | active
                        </div>
                      </li>
                      <li style={{ marginTop: '10px' }}>
                        Nama tab: <strong style={{ color: 'var(--text-primary)' }}>Channels</strong>
                        <br />
                        Tulis header berikut di baris pertama (kolom A-C):
                        <div style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg-app)', padding: '6px', borderRadius: '4px', marginTop: '4px', color: 'var(--primary)' }}>
                          id | name | color
                        </div>
                      </li>
                      <li style={{ marginTop: '10px' }}>
                        Nama tab: <strong style={{ color: 'var(--text-primary)' }}>Comments</strong>
                        <br />
                        Tulis header berikut di baris pertama (kolom A-E):
                        <div style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg-app)', padding: '6px', borderRadius: '4px', marginTop: '4px', color: 'var(--primary)' }}>
                          id | contentId | author | text | createdAt
                        </div>
                      </li>
                      <li style={{ marginTop: '10px' }}>
                        Nama tab: <strong style={{ color: 'var(--text-primary)' }}>KPI Definitions</strong>
                        <br />
                        Tulis header berikut di baris pertama (kolom A-N):
                        <div style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg-app)', padding: '6px', borderRadius: '4px', marginTop: '4px', color: 'var(--primary)', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                          id | clientBrandId | client | brand | name | category | unit | baseline | target | direction | cadence | weight | active | createdAt
                        </div>
                      </li>
                      <li style={{ marginTop: '10px' }}>
                        Nama tab: <strong style={{ color: 'var(--text-primary)' }}>KPI Updates</strong>
                        <br />
                        Tulis header berikut di baris pertama (kolom A-H):
                        <div style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg-app)', padding: '6px', borderRadius: '4px', marginTop: '4px', color: 'var(--primary)', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                          id | kpiId | period | actual | notes | sourceLink | updatedBy | updatedAt
                        </div>
                      </li>
                      <li style={{ marginTop: '10px' }}>
                        Nama tab: <strong style={{ color: 'var(--text-primary)' }}>Task Members</strong>
                        <br />
                        Tulis header berikut di baris pertama (kolom A-F):
                        <div style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg-app)', padding: '6px', borderRadius: '4px', marginTop: '4px', color: 'var(--primary)', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                          id | taskId | userId | role | addedAt | addedBy
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                    <strong>2. Paste & Deploy Google Apps Script:</strong>
                    <ol style={{ paddingLeft: '24px', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <li>
                        Di spreadsheet Anda, buka menu <strong style={{ color: 'var(--text-primary)' }}>Extensions &gt; Apps Script</strong>.
                      </li>
                      <li>
                        Hapus semua kode bawaan editor, lalu salin dan tempel kode script berikut:
                        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '8px', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-app)', padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>Code.gs</span>
                            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={copyScriptCode}>
                              {copied ? <Check size={12} style={{ color: '#16a34a' }} /> : <Copy size={12} />}
                              <span style={{ marginLeft: '4px' }}>{copied ? 'Copied' : 'Copy Code'}</span>
                            </button>
                          </div>
                          <pre style={{ maxHeight: '200px', overflowY: 'auto', padding: '12px', fontSize: '11px', fontFamily: 'monospace', backgroundColor: '#ffffff', color: '#1e293b', border: '1px solid var(--border-subtle)' }}>
{`function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const content = getSheetData(sheet.getSheetByName("Content"));
  const team = getSheetData(sheet.getSheetByName("Team"));
  const channels = getSheetData(sheet.getSheetByName("Channels"));
  ... (klik Copy Code untuk salin lengkap)`}
                          </pre>
                        </div>
                      </li>
                      <li>
                        Klik tombol 💾 <strong style={{ color: 'var(--text-primary)' }}>Save</strong>.
                      </li>
                      <li>
                        Klik tombol <strong style={{ color: 'var(--text-primary)' }}>Deploy &gt; New Deployment</strong>.
                      </li>
                      <li>
                        Pilih jenis tipe deployment: <strong style={{ color: 'var(--text-primary)' }}>Web App</strong>.
                      </li>
                      <li>
                        Isi konfigurasi berikut:
                        <ul style={{ listStyleType: 'circle', paddingLeft: '20px', marginTop: '4px' }}>
                          <li>Description: <strong style={{ color: 'var(--text-primary)' }}>ContentLab API</strong></li>
                          <li>Execute as: <strong style={{ color: 'var(--text-primary)' }}>Me</strong></li>
                          <li>Who has access: <strong style={{ color: 'var(--text-primary)' }}>Anyone</strong></li>
                        </ul>
                      </li>
                      <li>
                        Klik <strong style={{ color: 'var(--text-primary)' }}>Deploy</strong>, lalu berikan izin akses akun Google Anda jika diminta.
                      </li>
                      <li>
                        Simpan Web App URL sebagai <strong>VITE_GOOGLE_SHEETS_URL</strong> pada konfigurasi deployment. Kolom override di atas hanya untuk pengujian browser tertentu.
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
