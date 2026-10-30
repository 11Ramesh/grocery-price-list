/**
 * data-service.js — Data fetching and parsing
 * =============================================
 * Fetches the Google Sheets CSV, parses rows into product objects,
 * and handles caching, errors, and Sinhala Unicode safely.
 */

const DataService = (() => {

  // Internal cache store
  let _cachedProducts = null;
  let _cachedAt = null;

  /**
   * Parse a CSV string into an array of row arrays.
   * Handles quoted fields (including commas and newlines inside quotes),
   * UTF-8 Sinhala text, and BOM characters.
   */
  function parseCSV(raw) {
    // Strip UTF-8 BOM if present
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);

    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      const next = raw[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          // Escaped quote inside quoted field
          field += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          field += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          row.push(field.trim());
          field = "";
        } else if (ch === '\r' && next === '\n') {
          row.push(field.trim());
          rows.push(row);
          row = [];
          field = "";
          i++; // skip \n
        } else if (ch === '\n' || ch === '\r') {
          row.push(field.trim());
          rows.push(row);
          row = [];
          field = "";
        } else {
          field += ch;
        }
      }
    }
    // Push last field/row
    if (field || row.length > 0) {
      row.push(field.trim());
      rows.push(row);
    }

    return rows;
  }

  /**
   * Convert raw CSV rows into product objects using the configured column names.
   * Skips blank rows, validates prices, and deduplicates entries.
   */
  function rowsToProducts(rows) {
    if (!rows || rows.length < 2) return [];

    const headers = rows[0];
    const col = CONFIG.columns;

    // Find column indices (trim headers to be safe)
    const idx = {
      name:     headers.findIndex(h => h.trim() === col.name),
      category: headers.findIndex(h => h.trim() === col.category),
      price:    headers.findIndex(h => h.trim() === col.price),
      unit:     headers.findIndex(h => h.trim() === col.unit),
      status:   headers.findIndex(h => h.trim() === col.status || h.trim().toLowerCase() === "status" || h.trim().toLowerCase() === "active"),
    };

    // Warn in console if columns not found
    Object.entries(idx).forEach(([key, i]) => {
      if (i === -1 && key !== 'status') console.warn(`[DataService] Column not found: "${col[key]}" (key: ${key})`);
    });

    const seen = new Set();
    const products = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];

      // Skip completely blank rows
      if (!row || row.every(cell => !cell)) continue;

      const name     = idx.name     >= 0 ? (row[idx.name]     || "").trim() : "";
      const category = idx.category >= 0 ? (row[idx.category] || "").trim() : "";
      const priceRaw = idx.price    >= 0 ? (row[idx.price]    || "").trim() : "";
      const unit     = idx.unit     >= 0 ? (row[idx.unit]     || "").trim() : "";
      const statusRaw = idx.status  >= 0 ? (row[idx.status]   || "").trim() : "Active";

      // Skip rows with no product name
      if (!name) continue;

      // Check Active vs Inactive status (default is Active)
      const isInactive = /^(inactive|hide|hidden|අක්‍රිය|අක්‍රියයි|no|false|0)$/i.test(statusRaw);
      const status = isInactive ? "Inactive" : "Active";

      // Deduplicate by name+category
      const key = `${name}|${category}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      // Parse price safely
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
        id: `p-${r}`,
        name,
        category: category || "වෙනත්",
        price,
        priceDisplay,
        priceRaw,
        unit,
        status, // "Active" | "Inactive"
        // Searchable blob (lowercase for fast matching)
        _search: `${name} ${category} ${unit}`.toLowerCase(),
      });
    }

    return products;
  }

  /**
   * Fetch CSV from the configured URL.
   * Returns a parsed array of product objects.
   * Throws on network failure.
   */
  async function fetchProducts(forceRefresh = false) {
    const now = Date.now();
    // Use short 30-second cache or instant refresh
    const cacheMs = 30 * 1000;

    // Return from memory cache if fresh and not force-refreshing
    if (!forceRefresh && _cachedProducts && _cachedAt && (now - _cachedAt) < cacheMs) {
      return _cachedProducts;
    }

    let products = null;

    // 1. Try Real-Time Apps Script API first (0-delay Instant Live Data)
    if (CONFIG.ADMIN_API_URL) {
      try {
        const liveUrl = CONFIG.ADMIN_API_URL + (CONFIG.ADMIN_API_URL.includes("?") ? "&" : "?") + "action=getProducts&_t=" + now;
        const res = await fetch(liveUrl);
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && Array.isArray(json.products)) {
            products = json.products;
          }
        }
      } catch (err) {
        console.warn("[DataService] Real-time API fetch failed, falling back to CSV:", err);
      }
    }

    // 2. Fallback to published CSV
    if (!products) {
      const cacheBust = `&_cb=${now}`;
      const response = await fetch(CONFIG.CSV_URL + cacheBust);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const text = await response.text();
      const rows = parseCSV(text);
      products = rowsToProducts(rows);
    }

    // Store in memory and sessionStorage
    _cachedProducts = products;
    _cachedAt = now;
    try {
      sessionStorage.setItem("grocery_cache", JSON.stringify(products));
      sessionStorage.setItem("grocery_cache_at", String(now));
      sessionStorage.setItem("grocery_cache_updated", new Date().toISOString());
    } catch (_) { /* quota exceeded — ignore */ }

    return products;
  }

  /**
   * Get last-updated time from sessionStorage (ISO string or null).
   */
  function getLastUpdated() {
    try {
      return sessionStorage.getItem("grocery_cache_updated");
    } catch (_) { return null; }
  }

  /**
   * Clear all caches (memory + sessionStorage).
   */
  function clearCache() {
    _cachedProducts = null;
    _cachedAt = null;
    try {
      sessionStorage.removeItem("grocery_cache");
      sessionStorage.removeItem("grocery_cache_at");
      sessionStorage.removeItem("grocery_cache_updated");
    } catch (_) {}
  }

  return { fetchProducts, getLastUpdated, clearCache };

})();

