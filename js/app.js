/**
 * app.js — Main application controller
 * ======================================
 * Orchestrates data loading, rendering, search, filtering, and UI events.
 * All user-visible text is in Sinhala.
 */

const App = (() => {

  // ─── State ────────────────────────────────────────────────────────────────
  let allProducts     = [];
  let filteredProducts = [];
  let currentQuery    = "";
  let currentCategory = CONFIG.allCategoriesLabel;
  let currentSort     = "name";
  let isLoading       = false;

  // ─── DOM References (resolved after DOMContentLoaded) ─────────────────────
  let els = {};

  function resolveEls() {
    els = {
      searchInput:      document.getElementById("search-input"),
      searchClear:      document.getElementById("search-clear"),
      resultCount:      document.getElementById("result-count"),
      categoryBar:      document.getElementById("category-bar"),
      productGrid:      document.getElementById("product-grid"),
      sortSelect:       document.getElementById("sort-select"),
      errorState:       document.getElementById("error-state"),
      errorMsg:         document.getElementById("error-msg"),
      retryBtn:         document.getElementById("retry-btn"),
      emptyState:       document.getElementById("empty-state"),
      emptyMsg:         document.getElementById("empty-msg"),
      lastUpdated:      document.getElementById("last-updated"),
      refreshBtn:       document.getElementById("refresh-btn"),
      backToTop:        document.getElementById("back-to-top"),
      skeletonCards:    document.getElementById("skeleton-cards"),
      shopName:         document.getElementById("shop-name"),
      shopSubtitle:     document.getElementById("shop-subtitle"),
    };
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  async function init() {
    resolveEls();
    applyBranding();
    bindEvents();
    await loadData();
  }

  function applyBranding() {
    document.title = `${CONFIG.shopNameEn} — මිල දර්ශනය`;
    if (els.shopName)    els.shopName.textContent    = CONFIG.shopName;
    if (els.shopSubtitle) els.shopSubtitle.textContent = CONFIG.shopSubtitle;
  }

  // ─── Data Loading ──────────────────────────────────────────────────────────
  async function loadData(forceRefresh = false) {
    if (isLoading) return;
    isLoading = true;

    showLoading(true);
    hideError();
    hideEmptyState();

    try {
      allProducts = await DataService.fetchProducts(forceRefresh);
      renderCategories();
      applyFilters();
      showLastUpdated();
    } catch (err) {
      console.error("[App] Data fetch failed:", err);
      showError("දත්ත ලබාගැනීමට නොහැකි විය. අන්තර්ජාල සම්බන්ධතාවය පරීක්ෂා කර නැවත උත්සාහ කරන්න.");
    } finally {
      isLoading = false;
      showLoading(false);
    }
  }

  // ─── Events ───────────────────────────────────────────────────────────────
  function bindEvents() {
    // Search input — live filtering
    els.searchInput?.addEventListener("input", () => {
      currentQuery = els.searchInput.value;
      updateClearBtn();
      applyFilters();
    });

    // Clear search button
    els.searchClear?.addEventListener("click", () => {
      els.searchInput.value = "";
      currentQuery = "";
      updateClearBtn();
      els.searchInput.focus();
      applyFilters();
    });

    // Sort dropdown
    els.sortSelect?.addEventListener("change", () => {
      currentSort = els.sortSelect.value;
      applyFilters();
    });

    // Retry button
    els.retryBtn?.addEventListener("click", () => loadData(true));

    // Refresh button
    els.refreshBtn?.addEventListener("click", () => {
      DataService.clearCache();
      loadData(true);
    });

    // Back to top button
    els.backToTop?.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Show/hide back-to-top on scroll
    window.addEventListener("scroll", () => {
      if (els.backToTop) {
        els.backToTop.classList.toggle("visible", window.scrollY > 400);
      }
    }, { passive: true });
  }

  function updateClearBtn() {
    if (els.searchClear) {
      els.searchClear.style.display = currentQuery ? "flex" : "none";
    }
  }

  // ─── Categories ───────────────────────────────────────────────────────────
  function renderCategories() {
    if (!els.categoryBar) return;
    const categories = SearchEngine.getCategories(allProducts);

    // Build chips
    const chips = [];

    // "All" chip
    chips.push(makeCategoryChip(CONFIG.allCategoriesLabel, allProducts.length, true));

    for (const { name, count } of categories) {
      chips.push(makeCategoryChip(name, count, false));
    }

    els.categoryBar.innerHTML = "";
    chips.forEach(c => els.categoryBar.appendChild(c));
  }

  function makeCategoryChip(name, count, isAll) {
    const icon = isAll ? "🛒" : (CONFIG.categoryIcons[name] || CONFIG.categoryIcons["Default"] || "🛒");
    const chip = document.createElement("button");
    chip.className = "category-chip";
    chip.setAttribute("aria-label", `${name} - භාණ්ඩ ${count}ක්`);
    chip.dataset.category = name;
    chip.innerHTML = `<span class="chip-icon">${icon}</span><span class="chip-label">${escapeHtml(name)}</span><span class="chip-count">${count}</span>`;

    if (name === currentCategory) chip.classList.add("active");

    chip.addEventListener("click", () => {
      currentCategory = name;
      document.querySelectorAll(".category-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      applyFilters();
    });

    return chip;
  }

  // ─── Filtering & Rendering ─────────────────────────────────────────────────
  function applyFilters() {
    filteredProducts = SearchEngine.filterAndSort(
      allProducts,
      currentQuery,
      currentCategory,
      currentSort
    );
    renderProducts();
    updateResultCount();
  }

  function updateResultCount() {
    if (!els.resultCount) return;
    const n = filteredProducts.length;
    if (currentQuery || currentCategory !== CONFIG.allCategoriesLabel) {
      els.resultCount.textContent = `භාණ්ඩ ${n}ක් හමු විය`;
      els.resultCount.style.display = "block";
    } else {
      els.resultCount.textContent = `සම්පූර්ණ භාණ්ඩ ${n}ක්`;
      els.resultCount.style.display = "block";
    }
  }

  function renderProducts() {
    if (!els.productGrid) return;

    if (filteredProducts.length === 0) {
      els.productGrid.innerHTML = "";
      showEmptyState();
      return;
    }

    hideEmptyState();

    // Render up to productsPerPage products
    const toRender = filteredProducts.slice(0, CONFIG.productsPerPage);

    // Build fragment for performance
    const fragment = document.createDocumentFragment();
    for (const product of toRender) {
      fragment.appendChild(makeProductCard(product));
    }

    els.productGrid.innerHTML = "";
    els.productGrid.appendChild(fragment);

    // If more products exist, show a note
    if (filteredProducts.length > CONFIG.productsPerPage) {
      const note = document.createElement("p");
      note.className = "more-note";
      note.textContent = `... ${filteredProducts.length - CONFIG.productsPerPage}ක් වැඩිය. සෙවීමෙන් නිශ්චිත භාණ්ඩය සොයන්න.`;
      els.productGrid.appendChild(note);
    }
  }

  function makeProductCard(product) {
    const card = document.createElement("div");
    card.className = "product-card";
    card.setAttribute("role", "article");
    card.setAttribute("aria-label", product.name);

    const icon = CONFIG.categoryIcons[product.category] || CONFIG.categoryIcons["Default"] || "🛒";

    // Price display
    let priceHtml;
    if (product.price !== null) {
      priceHtml = `<span class="price-amount">${CONFIG.currency}&nbsp;${product.priceDisplay}</span>`;
    } else if (product.priceRaw) {
      priceHtml = `<span class="price-unavailable">${escapeHtml(product.priceRaw)}</span>`;
    } else {
      priceHtml = `<span class="price-unavailable">මිල නොදැනේ</span>`;
    }

    // Unit display
    const unitHtml = product.unit
      ? `<span class="product-unit">${escapeHtml(product.unit)}</span>`
      : "";

    card.innerHTML = `
      <div class="card-icon" aria-hidden="true">${icon}</div>
      <div class="card-body">
        <div class="card-category">${escapeHtml(product.category)}</div>
        <h3 class="card-name">${escapeHtml(product.name)}</h3>
        ${unitHtml}
        <div class="card-price">${priceHtml}</div>
      </div>
      <button class="share-btn" aria-label="${escapeHtml(product.name)} බෙදා ගන්න" data-id="${product.id}" title="බෙදා ගන්න">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
      </button>
    `;

    // Share button handler
    card.querySelector(".share-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      shareProduct(product);
    });

    return card;
  }

  // ─── Share ─────────────────────────────────────────────────────────────────
  async function shareProduct(product) {
    const priceStr = product.price !== null
      ? `${CONFIG.currency} ${product.priceDisplay}`
      : "මිල නොදැනේ";
    const unitStr = product.unit ? ` (${product.unit})` : "";
    const text = `${product.name}${unitStr} — ${priceStr}\n${CONFIG.shopName}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text, url: window.location.href });
        return;
      } catch (_) { /* user cancelled */ }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      showToast("විස්තර පිටපත් කරන ලදී ✓");
    } catch (_) {
      showToast("Share සඳහා browser support නොමැත");
    }
  }

  // ─── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg) {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("visible");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("visible"), 3000);
  }

  // ─── UI State Helpers ──────────────────────────────────────────────────────
  function showLoading(show) {
    const skeletons = document.getElementById("skeleton-cards");
    const grid = els.productGrid;
    if (skeletons) skeletons.style.display = show ? "grid" : "none";
    if (grid) grid.style.display = show ? "none" : "grid";
    if (els.resultCount) els.resultCount.style.display = show ? "none" : "block";
    // Announce loading state to screen readers
    document.body.setAttribute("aria-busy", show ? "true" : "false");
  }

  function showError(msg) {
    if (els.errorState) els.errorState.style.display = "flex";
    if (els.errorMsg)   els.errorMsg.textContent = msg;
    if (els.productGrid) els.productGrid.innerHTML = "";
    hideEmptyState();
  }

  function hideError() {
    if (els.errorState) els.errorState.style.display = "none";
  }

  function showEmptyState() {
    if (els.emptyState) {
      els.emptyState.style.display = "flex";
      // Contextual message
      if (currentQuery) {
        els.emptyMsg.textContent = `"${currentQuery}" සඳහා භාණ්ඩ හමු නොවීය. වෙනත් වචනයකින් සොයන්න.`;
      } else if (currentCategory !== CONFIG.allCategoriesLabel) {
        els.emptyMsg.textContent = `"${currentCategory}" කාණ්ඩයේ භාණ්ඩ නොමැත.`;
      } else {
        els.emptyMsg.textContent = `දැනට භාණ්ඩ ලැයිස්තුව හිස් ය. ටික වේලාවකින් නැවත උත්සාහ කරන්න.`;
      }
    }
  }

  function hideEmptyState() {
    if (els.emptyState) els.emptyState.style.display = "none";
  }

  function showLastUpdated() {
    const iso = DataService.getLastUpdated();
    if (!iso || !els.lastUpdated) return;
    const dt = new Date(iso);
    const formatted = dt.toLocaleString("si-LK", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    els.lastUpdated.textContent = `අවසන් යාවත්කාලීනය: ${formatted}`;
    els.lastUpdated.style.display = "block";
  }

  // ─── Security: Safe HTML escaping ──────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return { init };

})();

// Boot when DOM is ready
document.addEventListener("DOMContentLoaded", App.init);
