function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const content = getSheetData(sheet.getSheetByName("Content"));
  const team = getSheetData(sheet.getSheetByName("Team"));
  const channels = getSheetData(sheet.getSheetByName("Channels"));
  const comments = getSheetData(sheet.getSheetByName("Comments"));
  const clients = getSheetData(sheet.getSheetByName("Clients"));
  const kpiDefinitions = getSheetData(sheet.getSheetByName("KPI Definitions"));
  const kpiUpdates = getSheetData(sheet.getSheetByName("KPI Updates"));
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
    kpiUpdates: kpiUpdates
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
      item.id = item.id || Utilities.getUUID();
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
        contentSheet.getRange(rowIndex, 1, 1, 26).setValues([[
          item.id, item.title, item.brief, item.status, 
          item.channel, item.format, item.priority, item.assignee, item.publishDate,
          item.assetsLink, item.tags || "", item.budget || "", item.platformNotes || "", 
          item.targetAudience || "", item.createdBy || "", item.checklist || "",
          item.views || "", item.likes || "", item.engagement || "",
          item.createdAt, item.updatedAt, item.taskType || "Content", item.category || "",
          item.dueDate || "", item.client || "", item.brand || ""
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
      definition.id = definition.id || Utilities.getUUID();
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
      update.id = update.id || Utilities.getUUID();
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
                const subject = "[ContentLab] Mentions from " + comment.author + " on \"" + contentTitle + "\"";
                const body = "Halo " + member.name + ",\n\n" +
                             comment.author + " menyebut Anda dalam diskusi revisi untuk \"" + contentTitle + "\":\n\n" +
                             "\"" + text + "\"\n\n" +
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
