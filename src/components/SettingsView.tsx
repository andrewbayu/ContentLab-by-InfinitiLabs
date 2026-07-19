import React, { useState } from 'react';
import { getScriptUrl, saveScriptUrl, validateScriptUrl } from '../services/sheets';
import type { TeamMember, Channel, VariablesConfig } from '../services/sheets';
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
  Plus
} from 'lucide-react';

interface SettingsViewProps {
  onConnectionChange: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  
  variablesConfig: VariablesConfig;
  onSaveVariablesConfig: (config: VariablesConfig) => void;
  
  tags: string[];
  onAddTag: (tag: string) => void;
  onDeleteTag: (tag: string) => void;
  
  team: TeamMember[];
  onAddCreator: (name: string, email: string) => Promise<TeamMember>;
  onDeleteCreator: (id: string) => void;
  
  channels: Channel[];
  onAddChannel: (name: string, color: string) => Promise<Channel>;
  onDeleteChannel: (id: string) => void;
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
  onDeleteCreator,
  channels,
  onAddChannel,
  onDeleteChannel
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'variables' | 'tags' | 'team' | 'channels' | 'connection'>('variables');
  
  // Connection state
  const [url, setUrl] = useState(getScriptUrl() || '');
  const [isValidating, setIsValidating] = useState(false);
  const [copied, setCopied] = useState(false);

  // New Tag form state
  const [newTag, setNewTag] = useState('');

  // New Creator form state
  const [creatorName, setCreatorName] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [isAddingCreator, setIsAddingCreator] = useState(false);

  // New Channel form state
  const [channelName, setChannelName] = useState('');
  const [channelColor, setChannelColor] = useState('#2563eb');
  const [isAddingChannel, setIsAddingChannel] = useState(false);

  const currentUrl = getScriptUrl();

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      saveScriptUrl('');
      onConnectionChange();
      addToast('Disconnected. Switched back to Mock Sandbox mode.', 'info');
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
    setUrl('');
    onConnectionChange();
    addToast('Disconnected. Switched to Mock Sandbox.', 'info');
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
    if (!creatorName.trim()) return;
    setIsAddingCreator(true);
    try {
      await onAddCreator(creatorName.trim(), creatorEmail.trim());
      setCreatorName('');
      setCreatorEmail('');
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

  const copyScriptCode = () => {
    const code = `function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const content = getSheetData(sheet.getSheetByName("Content"));
  const team = getSheetData(sheet.getSheetByName("Team"));
  const channels = getSheetData(sheet.getSheetByName("Channels"));
  
  const payload = {
    content: content,
    team: team,
    channels: channels
  };
  
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
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
      item.id = Utilities.getUUID();
      item.createdAt = new Date().toISOString();
      item.updatedAt = new Date().toISOString();
      
      contentSheet.appendRow([
        item.id, item.title, item.brief, item.status, 
        item.channel, item.format, item.priority, item.assignee, item.publishDate,
        item.assetsLink, item.tags || "", item.budget || "", item.platformNotes || "", 
        item.targetAudience || "", item.createdAt, item.updatedAt
      ]);
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
        contentSheet.getRange(rowIndex, 1, 1, 16).setValues([[
          item.id, item.title, item.brief, item.status, 
          item.channel, item.format, item.priority, item.assignee, item.publishDate,
          item.assetsLink, item.tags || "", item.budget || "", item.platformNotes || "", 
          item.targetAudience || "", item.createdAt, item.updatedAt
        ]]);
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
        result = { success: true };
      } else {
        result = { success: false, error: "Content item not found" };
      }
    }
    else if (action === "createTeamMember") {
      const teamSheet = sheet.getSheetByName("Team");
      const member = postData.member;
      teamSheet.appendRow([
        member.id, member.name, member.email, member.avatar
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
    else if (action === "createComment") {
      const commentSheet = sheet.getSheetByName("Comments");
      const comment = postData.comment;
      comment.id = Utilities.getUUID();
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
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  }
}

function getSheetData(sheet) {
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length <= 1) return [];
  
  const headers = values[0];
  const data = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[i][j];
    }
    data.push(row);
  }
  return data;
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
                {team.map((member) => (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={member.avatar} alt={member.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{member.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{member.email}</div>
                      </div>
                    </div>
                    <button className="btn btn-secondary btn-icon-only" style={{ border: 'none', padding: '4px' }} onClick={() => onDeleteCreator(member.id)}>
                      <Trash2 size={14} style={{ color: '#dc2626' }} />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddCreatorSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Creator Name *"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  style={{ flex: '1 1 200px' }}
                  required
                />
                <input
                  type="email"
                  className="form-input"
                  placeholder="Email Address"
                  value={creatorEmail}
                  onChange={(e) => setCreatorEmail(e.target.value)}
                  style={{ flex: '1 1 200px' }}
                />
                <button type="submit" className="btn btn-primary" disabled={isAddingCreator}>
                  {isAddingCreator ? 'Saving...' : 'Add Crew'}
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

          {/* CONNECTION TAB */}
          {activeSubTab === 'connection' && (
            <>
              <div className="insight-panel" style={{ gap: '16px' }}>
                <h3 className="insight-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Link size={18} className="text-secondary" />
                  <span>Google Sheets Connection Status</span>
                </h3>

                {currentUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'rgba(22, 163, 74, 0.06)', border: '1px solid rgba(22, 163, 74, 0.2)', borderRadius: '6px' }}>
                    <CheckCircle size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ fontWeight: 600, color: '#16a34a', fontSize: '14px' }}>Connected to Google Sheets API</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', wordBreak: 'break-all', fontFamily: 'monospace' }}>{currentUrl}</div>
                    </div>
                    <button className="btn btn-danger" onClick={handleDisconnect}>
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'rgba(217, 119, 6, 0.06)', border: '1px solid rgba(217, 119, 6, 0.2)', borderRadius: '6px' }}>
                    <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0 }} />
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ fontWeight: 600, color: '#d97706', fontSize: '14px' }}>Currently in Sandbox Mode</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        All actions are saved in your local browser sandbox. Link your spreadsheet script below to save to your sheet in real time.
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSaveConnection} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                  <div className="form-group">
                    <label className="form-label">Apps Script Deployed Web App URL</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={isValidating}>
                    {isValidating ? 'Validating Connection...' : 'Connect Spreadsheet'}
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
                      Buka spreadsheet Anda dan buat 3 tab dengan judul persis berikut:
                    </p>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '24px', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      <li>
                        Nama tab: <strong style={{ color: 'var(--text-primary)' }}>Content</strong>
                        <br />
                        Tulis header berikut di baris pertama (kolom A-P):
                        <div style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg-app)', padding: '6px', borderRadius: '4px', marginTop: '4px', color: 'var(--primary)', fontSize: '11px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                          id | title | brief | status | channel | format | priority | assignee | publishDate | assetsLink | tags | budget | platformNotes | targetAudience | createdAt | updatedAt
                        </div>
                      </li>
                      <li style={{ marginTop: '10px' }}>
                        Nama tab: <strong style={{ color: 'var(--text-primary)' }}>Team</strong>
                        <br />
                        Tulis header berikut di baris pertama (kolom A-D):
                        <div style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg-app)', padding: '6px', borderRadius: '4px', marginTop: '4px', color: 'var(--primary)' }}>
                          id | name | email | avatar
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
                        Salin **Web App URL** yang didapatkan, lalu tempelkan pada kolom status koneksi di bagian atas halaman ini!
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
