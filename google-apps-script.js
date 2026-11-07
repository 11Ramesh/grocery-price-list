/**
 * ============================================================================
 * GOOGLE APPS SCRIPT CODE - Kurudhuwatta Shop ADMIN API + VISITOR TRACKING
 * ============================================================================
 *
 * 1. Copy this entire code.
 * 2. In your Google Sheet: Extensions -> Apps Script -> replace all code -> paste.
 * 3. Save (disk icon).
 * 4. Deploy -> Manage deployments -> Edit (pencil) -> Version: "New version" -> Deploy.
 * ============================================================================
 */

// Admin password (server-side only - never exposed to frontend)
const ADMIN_PASSWORD = "Kuru@Shop#2026";

// Sheet name for visit logs
const VISITS_SHEET = "Visits";

// Sri Lanka Timezone
const TIMEZONE = "Asia/Colombo";

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
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();

    // Auto-create Header for Column E if missing
    const headerRow = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 5)).getValues()[0];
    if (!headerRow[4] || headerRow[4].toString().trim() === "") {
      sheet.getRange(1, 5).setValue("\u0dad\u0dad\u0dca\u0dad\u0dca\u0dc0\u0dba");
    }

    let data = {};
    if (e && e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch (err) { data = e.parameter || {}; }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    const action = data.action || "";

    // ─────────────────────────────────────────────────────────────
    // 0. PUBLIC: Log a visitor visit (called from index.html)
    // ─────────────────────────────────────────────────────────────
    if (action === "logVisit") {
      try {
        let visitsSheet = ss.getSheetByName(VISITS_SHEET);
        if (!visitsSheet) {
          visitsSheet = ss.insertSheet(VISITS_SHEET);
          visitsSheet.getRange(1, 1, 1, 3).setValues([["Date", "Time", "Device"]]);
          visitsSheet.setFrozenRows(1);
        }
        const now = new Date();
        const dateStr = Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd");
        const timeStr = Utilities.formatDate(now, TIMEZONE, "HH:mm:ss");
        const device = (data.device || "unknown").toString().substring(0, 30);
        // Prefix with single-quote to force plain text storage
        visitsSheet.appendRow(["'" + dateStr, timeStr, device]);
      } catch (visitErr) {
        // Non-critical: don't fail the response
      }
      return responseJSON({ success: true });
    }

    // ─────────────────────────────────────────────────────────────
    // 1. PUBLIC: Get Products (real-time)
    // ─────────────────────────────────────────────────────────────
    if (action === "getProducts") {
      const values = sheet.getDataRange().getValues();
      const products = [];
      if (values.length > 1) {
        for (let r = 1; r < values.length; r++) {
          const row = values[r];
          const name = row[0] ? row[0].toString().trim() : "";
          if (!name) continue;
          const category = row[1] ? row[1].toString().trim() : "\u0dc0\u0dd9\u0db1\u0dad\u0dca";
          const priceRaw = (row[2] !== undefined && row[2] !== null) ? row[2].toString().trim() : "";
          const unit = row[3] ? row[3].toString().trim() : "";
          const statusRaw = (row[4] !== undefined && row[4] !== null) ? row[4].toString().trim() : "Active";

          const isInactive = /^(inactive|hide|hidden|\u0d85\u0d9a\u0dca\u200d\u0dbb\u0dd2\u0dba|\u0d85\u0d9a\u0dca\u200d\u0dbb\u0dd2\u0dba\u0dba\u0dd2|no|false|0)$/i.test(statusRaw);
          const status = isInactive ? "Inactive" : "Active";

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
            status: status,
            _search: (name + " " + category + " " + unit).toLowerCase()
          });
        }
      }
      return responseJSON({ success: true, products: products });
    }

    // ─────────────────────────────────────────────────────────────
    // ADMIN ACTIONS (Password Required)
    // ─────────────────────────────────────────────────────────────
    const password = data.password || "";
    if (password !== ADMIN_PASSWORD) {
      return responseJSON({ success: false, message: "\u0db8\u0dd4\u0dbb\u0db4\u0daf\u0dba \u0dc0\u0dcf\u0dbb\u0daf\u0dd2! (Incorrect Password)" });
    }

    // 2. Verify Login
    if (action === "verifyLogin") {
      return responseJSON({ success: true, message: "Login \u0dc3\u0dcf\u0dbb\u0dca\u0da2\u0d9a\u0dba\u0dd2!" });
    }

    // 3. Get Visitor Statistics (Admin only)
    if (action === "getVisitorStats") {
      try {
        let visitsSheet = ss.getSheetByName(VISITS_SHEET);
        if (!visitsSheet || visitsSheet.getLastRow() <= 1) {
          return responseJSON({ success: true, today: 0, week: 0, month: 0, total: 0 });
        }

        const visitData = visitsSheet.getRange(2, 1, visitsSheet.getLastRow() - 1, 1).getValues();
        const now = new Date();
        const todayStr = Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd");

        // Calculate Monday of current week in Sri Lanka time
        // Day of week in ISO-8601: 1 (Mon) to 7 (Sun)
        const dayOfWeekStr = Utilities.formatDate(now, TIMEZONE, "u");
        const dayOfWeek = parseInt(dayOfWeekStr, 10) || 1;
        const daysToMonday = dayOfWeek - 1;
        const weekStart = new Date(now.getTime() - (daysToMonday * 24 * 60 * 60 * 1000));
        const weekStartStr = Utilities.formatDate(weekStart, TIMEZONE, "yyyy-MM-dd");

        // Month start: "YYYY-MM-01"
        const monthStartStr = Utilities.formatDate(now, TIMEZONE, "yyyy-MM") + "-01";

        let todayCount = 0, weekCount = 0, monthCount = 0, totalCount = 0;

        for (let i = 0; i < visitData.length; i++) {
          const raw = visitData[i][0];
          if (raw === undefined || raw === null || raw === "") continue;
          totalCount++;

          let rowDateStr = "";
          if (raw instanceof Date) {
            rowDateStr = Utilities.formatDate(raw, TIMEZONE, "yyyy-MM-dd");
          } else {
            const str = raw.toString().trim().replace(/^'/, "");
            if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
              rowDateStr = str.substring(0, 10);
            } else {
              const d = new Date(str);
              if (!isNaN(d.getTime())) {
                rowDateStr = Utilities.formatDate(d, TIMEZONE, "yyyy-MM-dd");
              } else {
                rowDateStr = str.substring(0, 10);
              }
            }
          }

          if (rowDateStr === todayStr) todayCount++;
          if (rowDateStr >= weekStartStr) weekCount++;
          if (rowDateStr >= monthStartStr) monthCount++;
        }

        return responseJSON({
          success: true,
          today: todayCount,
          week: weekCount,
          month: monthCount,
          total: totalCount
        });
      } catch (statsErr) {
        return responseJSON({ success: true, today: 0, week: 0, month: 0, total: 0 });
      }
    }

    // 4. Add New Product
    if (action === "addProduct") {
      const name = (data.name || "").trim();
      const category = (data.category || "").trim();
      const price = (data.price !== undefined && data.price !== null) ? data.price.toString().trim() : "";
      const unit = (data.unit || "").trim();
      const status = (data.status || "Active").trim();

      if (!name) {
        return responseJSON({ success: false, message: "\u0db7\u0dcf\u0dab\u0dca\u0da9\u0dba\u0dda \u0db1\u0db8 \u0d87\u0dad\u0dd4\u0dbd\u0dad\u0dca \u0d9a\u0dbb\u0db1\u0dca\u0db1." });
      }

      sheet.appendRow([name, category, price, unit, status]);
      return responseJSON({ success: true, message: "\"" + name + "\" \u0dc3\u0dcf\u0dbb\u0dca\u0da2\u0d9a\u0dc0 \u0d87\u0dad\u0dd4\u0dbd\u0dad\u0dca \u0d9a\u0dbb\u0db1 \u0dbd\u0daf\u0dd4!" });
    }

    // 5. Update Existing Product Price
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
        return responseJSON({ success: false, message: "\u0db7\u0dcf\u0dab\u0dca\u0da9\u0dba \u0dc4\u0db8\u0dd4 \u0db1\u0ddc\u0dc0\u0dd4\u0dba." });
      }

      sheet.getRange(foundRow, 3).setValue(newPrice);
      return responseJSON({ success: true, message: "\u0db8\u0dd2\u0dbd \u0dc3\u0dcf\u0dbb\u0dca\u0da2\u0d9a\u0dc0 \u0dba\u0dcf\u0dc5\u0dad\u0dca \u0d9a\u0dcf\u0dbd\u0dd4\u0db1 \u0dc0\u0dd2\u0dba!" });
    }

    // 6. Update Product Status (Active / Inactive)
    if (action === "updateStatus") {
      const name = (data.name || "").trim();
      const newStatus = (data.status || "Active").trim();
      const values = sheet.getDataRange().getValues();

      let foundRow = -1;
      for (let i = 1; i < values.length; i++) {
        if (values[i][0].toString().trim().toLowerCase() === name.toLowerCase()) {
          foundRow = i + 1;
          break;
        }
      }

      if (foundRow === -1) {
        return responseJSON({ success: false, message: "\u0db7\u0dcf\u0dab\u0dca\u0da9\u0dba \u0dc4\u0db8\u0dd4 \u0db1\u0ddc\u0dc0\u0dd4\u0dba." });
      }

      sheet.getRange(foundRow, 5).setValue(newStatus);
      const statusSi = newStatus === "Active"
        ? "\u0dc3\u0d9a\u0dca\u200d\u0dbb\u0dd2\u0dba \u0d9a\u0dbb\u0db1 \u0dbd\u0daf\u0dd4 (\u0db4\u0dcf\u0dbb\u0dd2\u0db7\u0dcf\u0d9c\u0dd2\u0d9a\u0dba\u0dd2\u0db1\u0dca\u0da7 \u0db4\u0dd9\u0db1\u0dda)"
        : "\u0d85\u0d9a\u0dca\u200d\u0dbb\u0dd2\u0dba \u0d9a\u0dbb\u0db1 \u0dbd\u0daf\u0dd4 (\u0db4\u0dcf\u0dbb\u0dd2\u0db7\u0dcf\u0d9c\u0dd2\u0d9a\u0dba\u0dd2\u0db1\u0dca\u0da7 \u0db1\u0ddc\u0db4\u0dd9\u0db1\u0dda)";
      return responseJSON({ success: true, message: "\"" + name + "\" " + statusSi });
    }

    // 7. Delete Product
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
        return responseJSON({ success: false, message: "\u0db7\u0dcf\u0dab\u0dca\u0da9\u0dba \u0dc4\u0db8\u0dd4 \u0db1\u0ddc\u0dc0\u0dd4\u0dba." });
      }

      sheet.deleteRow(foundRow);
      return responseJSON({ success: true, message: "\"" + name + "\" \u0dc3\u0dcf\u0dbb\u0dca\u0da2\u0d9a\u0dc0 \u0d89\u0dc0\u0dad\u0dca \u0d9a\u0dbb\u0db1 \u0dbd\u0daf\u0dd4!" });
    }

    return responseJSON({ success: false, message: "\u0dc0\u0dbd\u0d82\u0d9c\u0dd4 \u0db1\u0ddc\u0dc0\u0db1 Action \u0d87\u0d9a\u0d9a\u0dca." });

  } catch (error) {
    return responseJSON({ success: false, message: "\u0daf\u0ddc\u0dc2\u0dba\u0d9a\u0dca \u0dc3\u0dd2\u0daf\u0dd4\u0dc0\u0dd2\u0dba: " + error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
