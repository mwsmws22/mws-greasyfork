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
- Flags likely Paperless title typos when a page title is ~1–3 character edits away from a Paperless title (orange border + bottom-of-card panel: `Possible match:` + Paperless title)
- Injects a top control with 3 modes:
  - `Highlight` (default): matched items get yellow background
  - `Hide`: matched items are hidden
  - `Off`: no changes to listing cards (typo flags still shown)
- Persists selected mode in `localStorage`
- Reapplies automatically when the page updates dynamically

---

### bunpro-review-tweaks/

Tampermonkey script for [Bunpro](https://bunpro.jp) reviews. Unlike the other two scripts this one is a
small TypeScript project built with [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey);
the file to publish is the built `dist/bunpro-review-tweaks.user.js`.

**Target page:**

- `https://bunpro.jp/*` — matched broadly because Bunpro routes client-side, so `/reviews` is often
  reached without a page load. Features activate only when the elements they need are on the page.

**Features:**

- _Example sentence for every vocab review._ Bunpro only attaches an example sentence to a review once
  that sentence's English translation has been verified, so plenty of vocab is reviewed with no sentence
  at all. This fetches the term's sentences and shows one in the same card Bunpro uses.
  - Only for vocab, in `translate` question mode, after the answer is revealed **and** correct
  - Only when Bunpro did not supply a sentence itself
  - Starts on the term's first sentence, advances one per review session, and wraps around; the same
    term seen twice in one session keeps the same sentence

**Settings:**

Open the panel from the sliders icon in the quiz toolbar, next to Bunpro's own settings and styling
icons, or from `Settings` in the Tampermonkey menu. Feature toggles persist via `GM_setValue`.

**How it works:**

- Reads quiz state from Bunpro's own hidden `#quiz-metadata-element` (`data-meta-*`) rather than
  inferring it from the rendered DOM
- Calls `api.bunpro.jp` with the `frontend_api_token` cookie the Bunpro frontend already uses, so no
  extra credentials are needed
- Renders furigana and answer highlighting with a port of Bunpro's own renderer, covered by tests that
  compare against sentences captured from real Bunpro pages

**Development:**

```shell
cd bunpro-review-tweaks
npm install
npm run dev        # serves the script with live reload
npm test           # furigana / sentence rendering tests
npm run typecheck
npm run build      # writes dist/bunpro-review-tweaks.user.js
```