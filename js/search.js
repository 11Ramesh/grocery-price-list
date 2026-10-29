/**
 * search.js — Search and filter engine
 * ======================================
 * Fast local search across product name, category, and unit.
 * Supports partial Sinhala and English matching with relevance ranking.
 */

const SearchEngine = (() => {

  /**
   * Normalize a search string for comparison.
   * - Trim whitespace, collapse multiple spaces
   * - Lowercase (safe for Sinhala Unicode — only affects ASCII)
   * - Does NOT strip Sinhala characters
   */
  function normalize(str) {
    return (str || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  /**
   * Score how well a product matches the query.
   * Returns a numeric score (higher = better match). 0 = no match.
   *
   * Scoring tiers:
   *  100 — exact name match
   *   80 — name starts with query
   *   60 — name contains query
   *   40 — category or unit contains query
   *   20 — any field in the search blob contains query
   *    0 — no match
   */
  function score(product, query) {
    if (!query) return 1; // Everything matches empty query

    const q = normalize(query);
    if (!q) return 1;

    const name = normalize(product.name);
    const category = normalize(product.category);
    const unit = normalize(product.unit || "");
    const blob = product._search; // pre-normalized in data-service

    if (name === q) return 100;
    if (name.startsWith(q)) return 80;
    if (name.includes(q)) return 60;
    if (category.includes(q)) return 40;
    if (unit.includes(q)) return 35;
    if (blob.includes(q)) return 20;

    // Try matching each word in the query individually
    const words = q.split(" ").filter(w => w.length > 1);
    if (words.length > 1) {
      const allMatch = words.every(w => blob.includes(w));
      if (allMatch) return 15;
      const anyMatch = words.some(w => blob.includes(w));
      if (anyMatch) return 5;
    }

    return 0;
  }

  /**
   * Filter and sort products.
   *
   * @param {Array}  products      — Full product list
   * @param {string} query         — Raw search string from user
   * @param {string} categoryFilter — Category name, or CONFIG.allCategoriesLabel for none
   * @param {string} sortKey       — "name" | "price-asc" | "price-desc"
   * @returns {Array} Filtered, ranked, sorted product list
   */
  function filterAndSort(products, query, categoryFilter, sortKey) {
    const q = normalize(query);
    const allCat = normalize(CONFIG.allCategoriesLabel);
    const catFilter = normalize(categoryFilter);
    const useCategory = catFilter && catFilter !== allCat;

    // 1. Filter by category
    let result = useCategory
      ? products.filter(p => normalize(p.category) === catFilter)
      : products.slice();

    // 2. Filter and rank by search query
    if (q) {
      const scored = result
        .map(p => ({ p, s: score(p, q) }))
        .filter(({ s }) => s > 0);
      scored.sort((a, b) => b.s - a.s);
      result = scored.map(({ p }) => p);
    } else {
      // No query — just sort
      result = sortProducts(result, sortKey);
    }

    // 3. Apply sort on top of relevance only when not searching
    if (!q) {
      result = sortProducts(result, sortKey);
    }

    return result;
  }

  function sortProducts(products, sortKey) {
    const arr = products.slice();
    switch (sortKey) {
      case "price-asc":
        return arr.sort((a, b) => {
          if (a.price === null && b.price === null) return 0;
          if (a.price === null) return 1;
          if (b.price === null) return -1;
          return a.price - b.price;
        });
      case "price-desc":
        return arr.sort((a, b) => {
          if (a.price === null && b.price === null) return 0;
          if (a.price === null) return 1;
          if (b.price === null) return -1;
          return b.price - a.price;
        });
      case "name":
      default:
        return arr.sort((a, b) => a.name.localeCompare(b.name, "si"));
    }
  }

  /**
   * Extract unique category list from products (sorted by count desc).
   */
  function getCategories(products) {
    const counts = {};
    for (const p of products) {
      const cat = p.category || "වෙනත්";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }

  return { filterAndSort, getCategories, normalize };

})();

