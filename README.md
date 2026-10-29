# 🛒 Sinhala Grocery Price List Website

A beautiful, mobile-first price catalogue for Sri Lankan grocery shops.  
Customers scan a QR code and instantly browse prices in Sinhala.

---

## Live Demo
After GitHub Pages is enabled your URL will be:
```
https://<your-github-username>.github.io/<repository-name>/
```

---

## Features
- 🇱🇰 Full Sinhala UI
- ⚡ Live search (partial match, Sinhala + English)
- 🗂️ Category filter chips
- 💰 Price sorting (low → high, high → low)
- 📱 Mobile-first, works on all screen sizes
- 🔄 Auto-loads from Google Sheets CSV
- 📋 Share / copy product details
- 🔁 Refresh button for latest prices
- ♿ Accessible (semantic HTML, ARIA, keyboard nav)

---

## Project Structure

```
grocery-price-list/
├── index.html          — Main page
├── css/
│   └── style.css       — All styles (design system)
├── js/
│   ├── config.js       ← Edit this for shop name, CSV URL, category icons
│   ├── data-service.js — CSV fetching, parsing, caching
│   ├── search.js       — Search & filter engine
│   └── app.js          — UI controller
├── assets/
│   └── images/         — Place logo or product images here
└── README.md
```

---

## Setup Instructions

### 1. Update Shop Details

Open **`js/config.js`** and change:

```js
shopName:    "ඔබේ කඩේ නම",          // Sinhala shop name
shopNameEn:  "Your Shop Name",        // English (browser tab)
shopSubtitle: "අද දවසේ භාණ්ඩ මිල දර්ශනය",
```

### 2. Update the Google Sheets URL

In **`js/config.js`**:

```js
CSV_URL: "https://docs.google.com/spreadsheets/d/e/YOUR_KEY/pub?output=csv&gid=0",
```

**How to get your CSV URL:**
1. Open your Google Sheet
2. File → Share → Publish to web
3. Choose your sheet → **Comma-separated values (.csv)**
4. Click **Publish** → copy the URL
5. Paste it as `CSV_URL` in `config.js`

> ⚠️ Google Sheets changes may take up to 5 minutes to appear due to publishing cache.

### 3. Google Sheet Column Format

Your sheet must have these **exact** column headers in row 1:

| A | B | C | D |
|---|---|---|---|
| `භාණ්ඩයේ නම` | `කාණ්ඩය` | `මිල (රු.)` | `ඒකකය` |

Example rows:

| භාණ්ඩයේ නම | කාණ්ඩය | මිල (රු.) | ඒකකය |
|------------|--------|-----------|-------|
| සුදු කැකුළු සහල් | සහල් | 220 | කි.ග්රෑ. 1 |
| ඉස්සන් | මාළු | 850 | කි.ග්රෑ. 1 |
| සීනි | සීනි | 175 | කි.ග්රෑ. 1 |

### 4. Add Category Icons

In **`js/config.js`**, add your actual categories to `categoryIcons`:

```js
categoryIcons: {
  "සහල්":  "🌾",
  "මාළු":  "🐟",
  // add more...
}
```

---

## Deploying to GitHub Pages

1. Create a new GitHub repository (e.g. `grocery-price-list`)
2. Upload all project files to the repository root
3. Go to **Settings → Pages**
4. Under **Source**, select `main` branch → `/ (root)`
5. Click **Save**
6. Your site will be live at:
   ```
   https://<username>.github.io/grocery-price-list/
   ```

---

## Generating the QR Code

Once your GitHub Pages URL is live:

1. Visit [qr.io](https://qr.io) or [goqr.me](https://goqr.me)
2. Enter your GitHub Pages URL
3. Download the QR code image (PNG or SVG)
4. Print and display it in your shop

> Make sure the QR code points to the **GitHub Pages URL**, not localhost.

---

## Updating Prices

1. Open your Google Sheet
2. Edit, add, or remove product rows
3. **File → Share → Publish to web** (re-publish if needed)
4. Changes appear on the website within ~5 minutes
5. Customers can tap **"නැවත ලබාගන්න"** to force a refresh

---

## Security Notes

- The Google Sheets CSV URL is **public** — anyone with the link can read the data
- Only put product names, categories, prices, and units in the sheet
- Do **not** include passwords, customer data, or private columns
- The website never executes content from the spreadsheet as code

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Products not loading | Check that the sheet is published (File → Share → Publish to web) |
| Old prices showing | Tap "නැවත ලබාගන්න" or wait 5 minutes for Google cache to clear |
| Sinhala text broken | Ensure your sheet uses UTF-8 (default in Google Sheets) |
| Categories not showing | Add products with a "කාණ්ඩය" value in column B |
| GitHub Pages 404 | Ensure `index.html` is in the root of the `main` branch |

---

## Credits

Built with HTML5, CSS3, and Vanilla JavaScript.  
Fonts: [Noto Sans Sinhala](https://fonts.google.com/noto/specimen/Noto+Sans+Sinhala) (Google Fonts).  
Data: Google Sheets published CSV.  
Hosting: GitHub Pages (free).

