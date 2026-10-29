/**
 * config.js — Central configuration file
 * ========================================
 * Edit this file to update shop details and the data source URL.
 * No other files need to be changed for basic configuration.
 */

const CONFIG = {
  // ─── Shop Branding ────────────────────────────────────────────────────────
  // Replace these placeholders with your actual shop details.
  shopName: "කුරුදුවත්ත කඩේ",           // Your shop name in Sinhala
  shopNameEn: "Kurudhuwatta Shop",       // Shop name in English (for <title> tag)
  shopSubtitle: "අද දවසේ භාණ්ඩ මිල දර්ශනය",  // Header subtitle
  shopTagline: "නැවුම් | ගුණාත්මක | දැරිය හැකි", // Optional tagline

  // ─── Data Source ──────────────────────────────────────────────────────────
  // The published Google Sheets CSV URL.
  // To update: File → Share → Publish to web → CSV → copy URL → paste here.
  CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRjdEBDxL3kb1YmEQnyY-hHTCZGJKw86-EidYjSn1_K9rOnNM_DyPomBK5iDKELyYXB0hzRPEeTf8IZ/pub?output=csv&gid=0",

  // ─── Column Mapping ───────────────────────────────────────────────────────
  // Exact column header names from your Google Sheet (case-sensitive).
  columns: {
    name: "භාණ්ඩයේ නම",   // Product name
    category: "කාණ්ඩය",       // Category
    price: "මිල (රු.)",     // Price in rupees
    unit: "ඒකකය",         // Unit (e.g. kg, g, L)
  },

  // ─── Display Options ──────────────────────────────────────────────────────
  currency: "රු.",              // Currency symbol shown on cards
  allCategoriesLabel: "සියල්ල", // Label for "show all" category chip
  productsPerPage: 200,         // Max products to render at once (performance)

  // ─── Cache & Refresh ──────────────────────────────────────────────────────
  // Google Sheets published CSV can have a ~5-minute publish delay.
  // The page fetches data once per session. Use the refresh button for latest.
  cacheMinutes: 5,              // How long (minutes) to keep data in sessionStorage

  // ─── Category Icons ───────────────────────────────────────────────────────
  // Maps category names to emoji icons. Add your actual categories here.
  // If a category is not listed, a default 🛒 icon is used.
  categoryIcons: {
    "සහල්": "🌾",
    "පිටි": "🌿",
    "කුළු බඩු": "🌶️",
    "තෙල්": "🫙",
    "සීනි": "🍬",
    "ලුණු": "🧂",
    "කිරි": "🥛",
    "බිත්තර": "🥚",
    "එළවළු": "🥦",
    "පලතුරු": "🍎",
    "මාළු": "🐟",
    "මස්": "🥩",
    "බීම": "🥤",
    "බිස්කට්": "🍪",
    "ටින් ආහාර": "🥫",
    "සබන්": "🧴",
    "ගෘහ භාණ්ඩ": "🏠",
    "Default": "🛒",
  },
};

