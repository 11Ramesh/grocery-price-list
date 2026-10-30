/**
 * ============================================================================
 * GOOGLE APPS SCRIPT CODE — කුරුදුවත්ත කඩේ ADMIN API
 * ============================================================================
 * 
 * මෙම Code එක ඔබේ Google Sheet එකට දමන ආකාරය:
 * 1. ඔබේ Google Sheet එක Open කරගන්න (https://docs.google.com/spreadsheets/d/1eJN3hYCtFBfNOME2rtfoKUCrerhSw0ZhQgJCMOFqAcE/edit)
 * 2. උඩ මෙනුවේ ඇති "Extensions" ➔ "Apps Script" ක්ලික් කරන්න.
 * 3. එහි ඇති පරණ Code සියල්ල මකා (Delete කර), පහත ඇති සම්පූර්ණ Code එක Paste කරන්න.
 * 4. උඩින් ඇති "Save" (💾) අයිකනය ඔබන්න.
 * 5. දකුණු පැත්තේ උඩ ඇති නිල් පාට "Deploy" ➔ "New deployment" ක්ලික් කරන්න.
 *    - Select type: "Web app" (⚙️ අයිකනයෙන්)
 *    - Description: "Admin API"
 *    - Execute as: "Me" (ඔබගේ ඊමේල් ලිපිනය)
 *    - Who has access: "Anyone" (ඉතා වැදගත්!)
 * 6. "Deploy" ඔබන්න. (Permissions ඉල්ලුවහොත් "Authorize access" ➔ Advanced ➔ Go to ... (unsafe) ➔ Allow කරන්න).
 * 7. අවසානයේ ලැබෙන "Web app URL" එක Copy කරගෙන `js/config.js` එකේ `ADMIN_API_URL` එකට ලබාදෙන්න!
 * ============================================================================
 */

// ඔබේ කැමැත්ත අනුව මෙතනින් Admin Password එක වෙනස් කරගත හැක (Default: 1234)
const ADMIN_PASSWORD = "1234";

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    let data = {};

    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter;
      }
    } else {
      data = e.parameter;
    }

    const action = data.action;
    const password = data.password;

    // Check Password
    if (password !== ADMIN_PASSWORD) {
      return responseJSON({ success: false, message: "මුරපදය වැරදියි! (Incorrect Password)" });
    }

    // 1. Verify Login
    if (action === "verifyLogin") {
      return responseJSON({ success: true, message: "Login සාර්ථකයි!" });
    }

    // 2. Add New Product
    if (action === "addProduct") {
      const name = (data.name || "").trim();
      const category = (data.category || "").trim();
      const price = (data.price || "").trim();
      const unit = (data.unit || "").trim();

      if (!name) {
        return responseJSON({ success: false, message: "භාණ්ඩයේ නම ඇතුළත් කරන්න." });
      }

      sheet.appendRow([name, category, price, unit]);
      return responseJSON({ success: true, message: `"${name}" සාර්ථකව ඇතුළත් කරන ලදී!` });
    }

    // 3. Update Existing Product Price / Details
    if (action === "updatePrice") {
      const name = (data.name || "").trim();
      const newPrice = (data.price || "").trim();
      const values = sheet.getDataRange().getValues();

      let foundRow = -1;
      for (let i = 1; i < values.length; i++) {
        if (values[i][0].toString().trim().toLowerCase() === name.toLowerCase()) {
          foundRow = i + 1; // 1-based index
          break;
        }
      }

      if (foundRow === -1) {
        return responseJSON({ success: false, message: "භාණ්ඩය හමු නොවීය." });
      }

      // Update Column C (Price)
      sheet.getRange(foundRow, 3).setValue(newPrice);
      return responseJSON({ success: true, message: `මිල සාර්ථකව යාවත්කාලීන විය (රු. ${newPrice})!` });
    }

    // 4. Delete Product
    if (action === "deleteProduct") {
      const name = (data.name || "").trim();
      const values = sheet.getDataRange().getValues();

      let foundRow = -1;
      for (let i = 1; i < values.length; i++) {
        if (values[i][0].toString().trim().toLowerCase() === name.toLowerCase()) {
          foundRow = i + 1;
          break;
        }
      }

      if (foundRow === -1) {
        return responseJSON({ success: false, message: "භාණ්ඩය හමු නොවීය." });
      }

      sheet.deleteRow(foundRow);
      return responseJSON({ success: true, message: `"${name}" සාර්ථකව ඉවත් කරන ලදී!` });
    }

    return responseJSON({ success: false, message: "වලංගු නොවන Action එකක්." });

  } catch (error) {
    return responseJSON({ success: false, message: "දෝෂයක් සිදුවිය: " + error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

