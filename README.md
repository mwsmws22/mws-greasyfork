# mws-greasyfork

This is my personal repository of Tampermonkey scripts, specifically ones hosted on [Greasy Fork](https://greasyfork.org/en).

## Scripts

### google-interface-cleanup-fixed.js

All credit goes to the original author, antics1. See [Google interface cleanup](https://greasyfork.org/en/scripts/504171-google-interface-cleanup).

My fixed version: [Google interface cleanup fixed](https://greasyfork.org/en/scripts/550855-google-interface-cleanup-fixed).

Unfortunately, the original script no longer works in its current state. I fixed it and also added a bunch of personal preferences tweaks.

**Tweaks:**

- Move uBlacklist `uBlacklist has blocked X sites Show` banner to top of search results container
- Removed `waitForKeyElements("#media_result_group", undesiredElement);`
- Add values to annoyances list
- Pretty formatting and random optimization from Copilot

**Description:**  
This script removes various unwanted elements from Google search results to provide a cleaner interface. It targets and hides elements such as "People also ask", "Videos", "Related searches", and many more. The script uses XPath to identify and remove these elements. It also includes functionality to hide or remove specific elements, traverse ancestor nodes to find and hide parent elements, and remove search suggestions.

---

### pal-system-mealkit-history-filter.user.js

Tampermonkey script for Pal System meal kit pages. It checks your Paperless documents and marks items you have already tried.

**Target page:**

- `https://shop.pal-system.co.jp/pal/InesOrderContents.do?contentsId=A900001*`

**What it does:**

- Fetches tried meal-kit titles from Paperless (`document_type=22`, `tag=125`)
- Matches Paperless titles to the Pal System item grid by normalized title
- Injects a top control with 3 modes:
  - `Highlight` (default): matched items get yellow background
  - `Hide`: matched items are hidden
  - `Off`: no changes to listing cards
- Persists selected mode in `localStorage`
- Reapplies automatically when the page updates dynamically