/**
 * ContentLab cover-image patch
 *
 * Add the uploadCoverImage branch inside your existing doPost(e), before its
 * final response:
 *
 * else if (action === "uploadCoverImage") {
 *   result = { success: true, coverImage: uploadCoverImage_(postData) };
 * }
 *
 * Then replace the fixed 26-column writes in createContent/updateContent with
 * writeContentItem_(contentSheet, rowIndexOrNull, item). This keeps all current
 * fields intact and writes coverImageUrl / coverImageId by header name.
 */

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
  // The thumbnail must be readable in the client portal, including for clients
  // who are not signed in to the team's Google Workspace.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    id: file.getId(),
    url: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1200"
  };
}

function writeContentItem_(contentSheet, rowIndex, item) {
  const headers = contentSheet.getRange(1, 1, 1, contentSheet.getLastColumn()).getValues()[0]
    .map(function(header) { return String(header).trim(); });
  const headerIndex = {};
  headers.forEach(function(header, index) { headerIndex[header] = index; });

  const values = rowIndex
    ? contentSheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0]
    : new Array(headers.length).fill("");

  Object.keys(item).forEach(function(key) {
    if (Object.prototype.hasOwnProperty.call(headerIndex, key)) values[headerIndex[key]] = item[key] || "";
  });

  if (rowIndex) contentSheet.getRange(rowIndex, 1, 1, headers.length).setValues([values]);
  else contentSheet.appendRow(values);
}

/*
 * Required existing doPost changes:
 *
 * CREATE:
 *   replace contentSheet.appendRow([...]) with:
 *   writeContentItem_(contentSheet, null, item);
 *
 * UPDATE:
 *   replace contentSheet.getRange(...).setValues([...]) with:
 *   writeContentItem_(contentSheet, rowIndex, item);
 *
 * The Content tab needs these exact headers after brand:
 *   coverImageUrl | coverImageId
 */
