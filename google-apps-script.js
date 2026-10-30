/**
 * ============================================================================
 * GOOGLE APPS SCRIPT CODE — කුරුදුවත්ත කඩේ ADMIN API & REAL-TIME DATA
 * ============================================================================
 * 
 * 1. මෙම සම්පූර්ණ Code එක Copy කරගන්න.
 * 2. Google Sheet එකේ Extensions ➔ Apps Script ගොස් පරණ Code එක මකා මෙය Paste කරන්න.
 * 3. Save (💾) ඔබන්න.
 * 4. උඩ දකුණු පැත්තේ Deploy ➔ Manage deployments ➔ Edit (✏️) ➔ Version: "New version" ➔ Deploy ඔබන්න.
 * ============================================================================
 */

// 🔒 ඔබගේ ආරක්ෂිත Strong Password එක (මෙතනින් වෙනස් කරගත හැක):
const ADMIN_PASSWORD = "Kuru@Shop#2026";

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

    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    const action = data.action || "";

    // 0. Public Action: REAL-TIME Instant Products Fetch (No Cache Delay!)
    if (action === "getProducts") {
      const values = sheet.getDataRange().getValues();
      const products = [];
      if (values.length > 1) {
        for (let r = 1; r < values.length; r++) {
          const row = values[r];
          const name = row[0] ? row[0].toString().trim() : "";
          if (!name) continue;
          const category = row[1] ? row[1].toString().trim() : "වෙනත්";
          const priceRaw = (row[2] !== undefined && row[2] !== null) ? row[2].toString().trim() : "";
          const unit = row[3] ? row[3].toString().trim() : "";

          let price = null;
          let priceDisplay = null;
          if (priceRaw !== "") {
            const num = parseFloat(priceRaw.replace(/[^\d.]/g, ""));
            if (!isNaN(num) && num >= 0) {
              price = num;
              priceDisplay = num.toLocaleString("si-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
          }

          products.push({
            id: "p-" + r,
            name: name,
            category: category,
            price: price,
            priceDisplay: priceDisplay,
            priceRaw: priceRaw,
            unit: unit,
            _search: (name + " " + category + " " + unit).toLowerCase()
          });
        }
      }
      return responseJSON({ success: true, products: products });
    }

    // ─── ADMIN ACTIONS (Password Required) ───
    const password = data.password || "";
    if (password !== ADMIN_PASSWORD) {
      return responseJSON({ success: false, message: "මුරපදය වැරදියි! (Incorrect Password)" });
    }

    // 1. Verify Login
    if (action === "verifyLogin") {
      return responseJSON({ success: true, message: "Login සාර්ථකයි!" });
    }

    // 2. Add New Product (Allows empty price)
    if (action === "addProduct") {
      const name = (data.name || "").trim();
      const category = (data.category || "").trim();
      const price = (data.price !== undefined && data.price !== null) ? data.price.toString().trim() : "";
      const unit = (data.unit || "").trim();

      if (!name) {
        return responseJSON({ success: false, message: "භාණ්ඩයේ නම ඇතුළත් කරන්න." });
      }

      sheet.appendRow([name, category, price, unit]);
      return responseJSON({ success: true, message: `"${name}" සාර්ථකව ඇතුළත් කරන ලදී!` });
    }

    // 3. Update Existing Product Price
    if (action === "updatePrice") {
      const name = (data.name || "").trim();
      const newPrice = (data.price !== undefined && data.price !== null) ? data.price.toString().trim() : "";
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

      sheet.getRange(foundRow, 3).setValue(newPrice);
      const displayMsg = newPrice ? `රු. ${newPrice}` : "මිල හිස් කරන ලදී";
      return responseJSON({ success: true, message: `මිල සාර්ථකව යාවත්කාලීන විය (${displayMsg})!` });
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
