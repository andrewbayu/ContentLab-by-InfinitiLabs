function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const content = getSheetData(sheet.getSheetByName("Content"));
  const team = getSheetData(sheet.getSheetByName("Team"));
  const channels = getSheetData(sheet.getSheetByName("Channels"));
  const comments = getSheetData(sheet.getSheetByName("Comments"));
  const clients = getSheetData(sheet.getSheetByName("Clients"));
  const kpiDefinitions = getSheetData(sheet.getSheetByName("KPI Definitions"));
  const kpiUpdates = getSheetData(sheet.getSheetByName("KPI Updates"));
  const taskMembers = getSheetData(sheet.getSheetByName("Task Members"));
  const documents = getSheetData(sheet.getSheetByName("Documents"));
  const publicTeam = team.map(function(member) {
    var roleStr = String(member.role || "team").toLowerCase();
    return {
      id: member.id,
      name: member.name,
      email: member.email,
      avatar: member.avatar,
      role: roleStr === "super" ? "super" : roleStr === "client" ? "client" : "team",
      client: member.client ? String(member.client) : ""
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
    taskMembers: taskMembers,
    documents: documents
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
      
      writeContentItem_(contentSheet, null, item);
      syncTaskMembers(sheet, item, true);
      result = { success: true, item: item };
    } 
    else if (action === "updateContent") {
      const contentSheet = sheet.getSheetByName("Content");
      const item = postData.item;
      
      const data = contentSheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0] || "").trim() === String(item.id || "").trim()) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex !== -1) {
        item.createdBy = data[rowIndex - 1][14] || item.createdBy || "";
        item.createdAt = data[rowIndex - 1][19] || item.createdAt;
        writeContentItem_(contentSheet, rowIndex, item);
        syncTaskMembers(sheet, item, false);
        result = { success: true, item: item };
      } else {
        // Upsert fallback: append as a new row if ID not found in sheet
        item.createdAt = item.createdAt || new Date().toISOString();
        item.updatedAt = new Date().toISOString();
        writeContentItem_(contentSheet, null, item);
        syncTaskMembers(sheet, item, true);
        result = { success: true, item: item };
      }
    }
    else if (action === "uploadCoverImage") {
      result = { success: true, coverImage: uploadCoverImage_(postData) };
    }
    else if (action === "deleteContent") {
      const contentSheet = sheet.getSheetByName("Content");
      const itemId = postData.id;
      const data = contentSheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0] || "").trim() === String(itemId || "").trim()) {
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
    else if (action === "createDocument") {
      const documentSheet = sheet.getSheetByName("Documents");
      if (!documentSheet) {
        result = { success: false, error: "Documents sheet not found" };
      } else {
        const document = postData.document || {};
        const now = new Date().toISOString();
        document.id = document.id || generateUuid();
        document.type = document.type || "Note";
        document.visibility = document.visibility || "personal";
        document.tags = Array.isArray(document.tags) ? document.tags.join(",") : (document.tags || "");
        document.pinned = document.pinned === true;
        document.createdAt = document.createdAt || now;
        document.updatedAt = now;

        documentSheet.appendRow([
          document.id, document.title || "", document.type, document.body || "",
          document.url || "", document.ownerId || "", document.visibility,
          document.client || "", document.brand || "", document.taskId || "",
          document.tags, document.pinned, document.createdAt, document.updatedAt
        ]);
        result = { success: true, document: document };
      }
    }
    else if (action === "updateDocument") {
      const documentSheet = sheet.getSheetByName("Documents");
      const document = postData.document || {};
      if (!documentSheet) {
        result = { success: false, error: "Documents sheet not found" };
      } else if (!document.id) {
        result = { success: false, error: "Document id is required" };
      } else {
        const documentData = documentSheet.getDataRange().getValues();
        let documentRowIndex = -1;
        for (let i = 1; i < documentData.length; i++) {
          if (String(documentData[i][0]).trim() === String(document.id).trim()) {
            documentRowIndex = i + 1;
            break;
          }
        }

        if (documentRowIndex === -1) {
          result = { success: false, error: "Document not found" };
        } else {
          document.type = document.type || "Note";
          document.visibility = document.visibility || "personal";
          document.tags = Array.isArray(document.tags) ? document.tags.join(",") : (document.tags || "");
          document.pinned = document.pinned === true;
          document.createdAt = documentData[documentRowIndex - 1][12] || document.createdAt || new Date().toISOString();
          document.updatedAt = new Date().toISOString();

          documentSheet.getRange(documentRowIndex, 1, 1, 14).setValues([[
            document.id, document.title || "", document.type, document.body || "",
            document.url || "", document.ownerId || "", document.visibility,
            document.client || "", document.brand || "", document.taskId || "",
            document.tags, document.pinned, document.createdAt, document.updatedAt
          ]]);
          result = { success: true, document: document };
        }
      }
    }
    else if (action === "deleteDocument") {
      const documentSheet = sheet.getSheetByName("Documents");
      const documentId = postData.id;
      if (!documentSheet) {
        result = { success: false, error: "Documents sheet not found" };
      } else if (!documentId) {
        result = { success: false, error: "Document id is required" };
      } else {
        const documentData = documentSheet.getDataRange().getValues();
        let documentRowIndex = -1;
        for (let i = 1; i < documentData.length; i++) {
          if (String(documentData[i][0]).trim() === String(documentId).trim()) {
            documentRowIndex = i + 1;
            break;
          }
        }

        if (documentRowIndex === -1) {
          result = { success: false, error: "Document not found" };
        } else {
          documentSheet.deleteRow(documentRowIndex);
          result = { success: true };
        }
      }
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
      let notificationStats = { sent: 0, failed: 0 };
      try {
        const text = String(comment.text || "");
        const lowerText = text.toLowerCase();
        const mentionIds = Array.isArray(comment.mentionedUserIds) ? comment.mentionedUserIds : [];

        if (text.includes("@") || mentionIds.length > 0) {
          const teamSheet = sheet.getSheetByName("Team");
          const teamData = getSheetData(teamSheet);
          const contentSheet = sheet.getSheetByName("Content");
          const contentData = getSheetData(contentSheet);
          
          let contentTitle = "Content Plan";
          for (let i = 0; i < contentData.length; i++) {
            if (String(contentData[i].id) === String(comment.contentId)) {
              contentTitle = contentData[i].title || "Content Plan";
              break;
            }
          }

          const recipients = [];
          const notifiedUserIds = {};

          for (let i = 0; i < teamData.length; i++) {
            const member = teamData[i];
            if (!member.email) continue;
            
            const memberId = String(member.id || "");
            const memberName = String(member.name || "").trim().toLowerCase();
            const firstName = memberName.split(" ")[0];

            const isMentionedById = mentionIds.indexOf(memberId) !== -1;
            const isMentionedByName = memberName && lowerText.indexOf("@" + memberName) !== -1;
            const isMentionedByFirstName = firstName && lowerText.indexOf("@" + firstName) !== -1;

            if ((isMentionedById || isMentionedByName || isMentionedByFirstName) && !notifiedUserIds[memberId]) {
              notifiedUserIds[memberId] = true;
              recipients.push(member);
            }
          }

          for (let i = 0; i < recipients.length; i++) {
            const member = recipients[i];
            try {
              const subject = "[ContentLab] " + comment.author + " mentioned you in \"" + contentTitle + "\"";
              const body = "Halo " + member.name + ",\n\n" +
                           comment.author + " menyebut Anda dalam diskusi revisi/konten \"" + contentTitle + "\":\n\n" +
                           "\"" + text + "\"\n\n" +
                           "Silakan buka ContentLab Studio Planner Anda untuk membalas.";
              MailApp.sendEmail(member.email, subject, body);
              notificationStats.sent++;
            } catch (sendErr) {
              console.error("Failed to send email to " + member.email + ": ", sendErr);
              notificationStats.failed++;
            }
          }
        }
      } catch (mailErr) {
        console.error("Mail notification error log: ", mailErr);
      }
      
      comment.notification = notificationStats;
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
          var roleStr = String(member.role || "team").toLowerCase();
          matchedUser = {
            id: member.id,
            name: member.name,
            email: member.email,
            avatar: member.avatar,
            role: roleStr === "super" ? "super" : roleStr === "client" ? "client" : "team",
            client: member.client ? String(member.client) : ""
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
    if (String(values[i][0] || "").trim() === "") continue;
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      const val = values[i][j];
      if (Object.prototype.toString.call(val) === '[object Date]') {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        row[headers[j]] = y + '-' + m + '-' + d;
      } else {
        row[headers[j]] = val;
      }
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
}

function generateUuid() {
  if (typeof Utilities !== 'undefined' && typeof Utilities.getUuid === 'function') {
    return Utilities.getUuid();
  }
  return 'id_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
}

function uploadCoverImage_(postData) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const mimeType = String(postData.mimeType || "");
  const fileName = String(postData.fileName || "content-cover");
  const dataUrl = String(postData.dataUrl || "");
  if (allowedTypes.indexOf(mimeType) === -1) throw new Error("Only JPG, PNG, and WebP are supported.");

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image payload.");
  const bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > 5 * 1024 * 1024) throw new Error("Image must be 5 MB or smaller.");

  const props = PropertiesService.getScriptProperties();
  let folderId = props.getProperty("CONTENTLAB_MEDIA_FOLDER_ID");
  let folder;
  if (folderId) {
    try { folder = DriveApp.getFolderById(folderId); } catch (error) { folder = null; }
  }
  if (!folder) {
    folder = DriveApp.createFolder("ContentLab Media");
    props.setProperty("CONTENTLAB_MEDIA_FOLDER_ID", folder.getId());
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const file = folder.createFile(Utilities.newBlob(bytes, mimeType, Date.now() + "-" + safeName));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    id: file.getId(),
    url: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1200"
  };
}

function writeContentItem_(contentSheet, rowIndex, item) {
  const lastCol = Math.max(contentSheet.getLastColumn(), 28);
  const headers = contentSheet.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(function(header) { return String(header).trim(); });
  
  // Ensure coverImageUrl and coverImageId headers exist if not present in row 1
  let coverUrlIdx = headers.indexOf("coverImageUrl");
  let coverIdIdx = headers.indexOf("coverImageId");
  
  if (coverUrlIdx === -1) {
    coverUrlIdx = headers.length;
    headers.push("coverImageUrl");
    contentSheet.getRange(1, coverUrlIdx + 1).setValue("coverImageUrl");
  }
  if (coverIdIdx === -1) {
    coverIdIdx = headers.length;
    headers.push("coverImageId");
    contentSheet.getRange(1, coverIdIdx + 1).setValue("coverImageId");
  }

  const headerIndex = {};
  headers.forEach(function(header, index) { headerIndex[header] = index; });

  const values = rowIndex
    ? contentSheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0]
    : new Array(headers.length).fill("");

  // Map known fields explicitly
  const fieldMapping = {
    id: item.id || "",
    title: item.title || "",
    brief: item.brief || "",
    status: item.status || "Idea",
    channel: item.channel || "Instagram",
    format: item.format || "Feed/Reels",
    priority: item.priority || "Medium",
    assignee: item.assignee || "",
    publishDate: item.publishDate || "",
    assetsLink: item.assetsLink || "",
    tags: item.tags || "",
    budget: item.budget || "",
    platformNotes: item.platformNotes || "",
    targetAudience: item.targetAudience || "",
    createdBy: item.createdBy || "",
    checklist: item.checklist || "",
    views: item.views || "",
    likes: item.likes || "",
    engagement: item.engagement || "",
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
    taskType: item.taskType || "Content",
    category: item.category || "",
    dueDate: item.dueDate || "",
    client: item.client || "",
    brand: item.brand || "",
    coverImageUrl: item.coverImageUrl || "",
    coverImageId: item.coverImageId || ""
  };

  Object.keys(fieldMapping).forEach(function(key) {
    if (Object.prototype.hasOwnProperty.call(headerIndex, key)) {
      values[headerIndex[key]] = fieldMapping[key];
    }
  });

  if (rowIndex) {
    contentSheet.getRange(rowIndex, 1, 1, headers.length).setValues([values]);
  } else {
    contentSheet.appendRow(values);
  }
}
