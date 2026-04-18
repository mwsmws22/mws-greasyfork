// ==UserScript==
// @name         Pal System Meal Kit History Filter
// @namespace    mwsmws22
// @version      0.2.5
// @author       mwsmws22
// @license      MIT
// @description  Hide or highlight meal kits already tried, based on Paperless titles.
// @match        https://shop.pal-system.co.jp/pal/InesOrderContents.do?contentsId=A900001*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
  "use strict";

  const PAPERLESS_API_URL =
    "https://<<PAPERLESS_HOST>>/api/documents/?page=1&page_size=500&truncate_content=true&tags__id__all=125&document_type__id__in=22";
  const PAPERLESS_API_TOKEN = "<<API_KEY>>";
  const DEBUG = false;
  const FETCH_TIMEOUT_MS = 12000;
  const FETCH_RETRY_COUNT = 2;

  const STORAGE_KEY_MODE = "palMealKitFilterMode";
  const DEFAULT_MODE = "highlight";
  const MODES = {
    HIDE: "hide",
    HIGHLIGHT: "highlight",
    OFF: "off",
  };

  const MARK_ATTR = "data-pal-mealkit-filter-marked";
  const ORIGINAL_STYLE_ATTR = "data-pal-mealkit-filter-original-style";
  const TITLE_SUFFIX_REGEX = /\s*\d+\s*セット\s*$/;
  /** Apply these patterns to both PAL and Paperless titles before comparison. */
  const TITLE_NOISE_PATTERNS = [/【冷凍】/g, /\([^)]*人分\s*\)/g];
  const REAPPLY_INTERVAL_MS = 1200;

  let triedTitles = new Set();
  let currentMode = loadMode();
  let observer = null;
  let hasLoadedTitles = false;
  let reapplyTimer = null;
  let latestStatusText = "Paperless読み込み中...";

  function log(...args) {
    if (!DEBUG) {
      return;
    }
    console.log("[Pal MealKit Filter]", ...args);
  }

  function run() {
    injectStyles();
    injectControlBar();
    log("run start", { url: location.href, mode: currentMode });
    fetchTriedTitlesWithRetry(FETCH_RETRY_COUNT)
      .then((titles) => {
        triedTitles = titles;
        hasLoadedTitles = true;
        log("paperless loaded", { titleCount: titles.size });
        applyModeToAllItems();
        startPeriodicReapply();
        startWatchingForListUpdates();
      })
      .catch((error) => {
        console.error("[Pal MealKit Filter] Failed to load Paperless data:", error);
        updateStatus("Paperless読み込み失敗");
        log("paperless failed", error);
      });
  }

  function loadMode() {
    const saved = localStorage.getItem(STORAGE_KEY_MODE);
    if (saved === MODES.HIDE || saved === MODES.HIGHLIGHT || saved === MODES.OFF) {
      return saved;
    }
    return DEFAULT_MODE;
  }

  function saveMode(mode) {
    localStorage.setItem(STORAGE_KEY_MODE, mode);
  }

  function injectStyles() {
    if (document.getElementById("pal-mealkit-filter-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "pal-mealkit-filter-style";
    style.textContent = `
      /* Light mode is the default; use #id + !important so host CSS cannot wash out text. */
      #pal-mealkit-filter-bar.pal-mealkit-filter-bar {
        margin: 2px 0 18px;
        padding: 18px 20px;
        width: 100%;
        max-width: 100%;
        background: #ffffff;
        border: 1px solid #e4e7ec;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(16, 24, 40, 0.06);
        display: flex;
        align-items: center;
        gap: 16px;
        font-size: 14px;
        flex-wrap: nowrap;
        box-sizing: border-box;
      }
      .pal-mealkit-filter-bar-left {
        display: flex;
        align-items: center;
        gap: 14px;
        flex: 1 1 auto;
        min-width: 0;
        flex-wrap: wrap;
      }
      .pal-mealkit-filter-bar-trail {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-shrink: 0;
        margin-left: auto;
      }
      /* Primary action — same blue language as Highlight (light UI). */
      #pal-mealkit-filter-bar .pal-mealkit-filter-display-btn {
        -webkit-appearance: none !important;
        appearance: none !important;
        flex-shrink: 0;
        box-sizing: border-box;
        border: 1px solid #334155 !important;
        border-radius: 8px;
        padding: 8px 16px !important;
        background: #1f2937 !important;
        color: #f8fafc !important;
        font-weight: 600;
        font-size: 12px;
        line-height: 1.35;
        cursor: pointer;
        transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
      }
      #pal-mealkit-filter-bar .pal-mealkit-filter-display-btn:hover {
        background: #334155 !important;
        border-color: #475569 !important;
        color: #ffffff !important;
      }
      #pal-mealkit-filter-bar .pal-mealkit-filter-display-btn.is-active {
        background: #1570ef !important;
        border-color: #1570ef !important;
        color: #ffffff !important;
      }
      [data-pal-mealkit-filter-host] .item-section-header .vue-items-display-setting {
        display: none !important;
      }
      [data-pal-mealkit-filter-host] .item-section-header .controller-line:has(.count-group) {
        display: none !important;
      }
      #pal-mealkit-filter-bar .pal-mealkit-filter-label {
        font-weight: 600;
        color: #0f172a !important;
        letter-spacing: 0.01em;
      }
      /* Segmented group: outer rounded shell; inner joins square; inactive = light outline style. */
      #pal-mealkit-filter-bar .pal-mealkit-filter-switch {
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        padding: 0 !important;
        gap: 0 !important;
        border-radius: 8px;
        border: 1px solid #cbd5e1 !important;
        background: #ffffff !important;
        overflow: hidden;
        box-sizing: border-box;
        align-self: center;
      }
      #pal-mealkit-filter-bar .pal-mealkit-filter-switch-btn {
        -webkit-appearance: none !important;
        appearance: none !important;
        margin: 0 !important;
        box-sizing: border-box;
        border: none !important;
        border-right: 1px solid #cbd5e1 !important;
        border-radius: 0 !important;
        padding: 8px 16px !important;
        min-height: 0;
        min-width: 0;
        width: auto;
        background: #ffffff !important;
        color: #1e293b !important;
        font-weight: 600;
        font-size: 12px;
        line-height: 1.4;
        cursor: pointer;
        transition: background 120ms ease, color 120ms ease;
      }
      #pal-mealkit-filter-bar .pal-mealkit-filter-switch-btn:last-child {
        border-right: none !important;
      }
      #pal-mealkit-filter-bar .pal-mealkit-filter-switch-btn:hover {
        background: #f8fafc !important;
        color: #0f172a !important;
      }
      #pal-mealkit-filter-bar .pal-mealkit-filter-switch-btn.is-active {
        background: #1570ef !important;
        color: #ffffff !important;
        box-shadow: none !important;
      }
      #pal-mealkit-filter-bar .pal-mealkit-filter-status {
        color: #0f172a !important;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.45;
      }
      @media (prefers-color-scheme: dark) {
        #pal-mealkit-filter-bar.pal-mealkit-filter-bar {
          background: #1f2631;
          border-color: #3a4655;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
        }
        #pal-mealkit-filter-bar .pal-mealkit-filter-label {
          color: #f8fafc !important;
        }
        #pal-mealkit-filter-bar .pal-mealkit-filter-switch {
          background: #1f2631 !important;
          border-color: #667085 !important;
          box-shadow: none;
        }
        #pal-mealkit-filter-bar .pal-mealkit-filter-switch-btn {
          background: #1f2631 !important;
          color: #e2e8f0 !important;
          border-right-color: #667085 !important;
        }
        #pal-mealkit-filter-bar .pal-mealkit-filter-switch-btn:hover {
          background: #2a3342 !important;
          color: #f8fafc !important;
        }
        #pal-mealkit-filter-bar .pal-mealkit-filter-switch-btn.is-active {
          background: #1570ef !important;
          color: #ffffff !important;
          box-shadow: none !important;
        }
        #pal-mealkit-filter-bar .pal-mealkit-filter-status {
          color: #e2e8f0 !important;
        }
        #pal-mealkit-filter-bar .pal-mealkit-filter-display-btn {
          background: #1f2937 !important;
          border-color: #475569 !important;
          color: #f8fafc !important;
        }
        #pal-mealkit-filter-bar .pal-mealkit-filter-display-btn:hover {
          background: #334155 !important;
          border-color: #64748b !important;
          color: #ffffff !important;
        }
        #pal-mealkit-filter-bar .pal-mealkit-filter-display-btn.is-active {
          background: #1570ef !important;
          border-color: #1570ef !important;
          color: #ffffff !important;
        }
      }
      .pal-mealkit-highlight {
        background: #fff3a0 !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Main product grid lives under #pageNaviTopForContent or a non-slider .vue-items-section.
   * A plain ".item-section-body > .inner" match is often the carousel block, not the grid.
   */
  function findPrimaryMealKitSection() {
    const byId = document.getElementById("pageNaviTopForContent");
    if (byId instanceof HTMLElement && byId.querySelector(":scope > .inner")) {
      return byId;
    }

    const sections = document.querySelectorAll(".vue-items-section.ipal-format.item-section");
    for (const section of sections) {
      if (section.classList.contains("vue-slider-items")) {
        continue;
      }
      if (section.querySelector(".item-section-body .vue-items.item-list")) {
        return section;
      }
    }

    const list = document.querySelector(".item-section-body .vue-items.item-list");
    if (list) {
      const section = list.closest(".vue-items-section.ipal-format.item-section");
      if (section && !section.classList.contains("vue-slider-items")) {
        return section;
      }
    }

    return null;
  }

  function getControlBarMountElement() {
    const section = findPrimaryMealKitSection();
    if (!section) {
      return null;
    }
    const inner = section.querySelector(":scope > .inner");
    return inner instanceof HTMLElement ? inner : null;
  }

  function getMealKitListRoot() {
    const section = findPrimaryMealKitSection();
    if (section) {
      const scoped = section.querySelector(".item-section-body .vue-items.item-list");
      if (scoped) {
        return scoped;
      }
    }
    const fallback = document.querySelector(".item-section-body .vue-items.item-list");
    return fallback instanceof HTMLElement ? fallback : null;
  }

  function injectControlBar() {
    if (document.getElementById("pal-mealkit-filter-bar")) {
      return;
    }

    const mount = getControlBarMountElement();
    if (!mount) {
      setTimeout(injectControlBar, 500);
      return;
    }

    const bar = document.createElement("div");
    bar.id = "pal-mealkit-filter-bar";
    bar.className = "pal-mealkit-filter-bar";

    const label = document.createElement("label");
    label.textContent = "試したお料理セット:";
    label.className = "pal-mealkit-filter-label";

    const switchWrap = document.createElement("div");
    switchWrap.className = "pal-mealkit-filter-switch";
    switchWrap.setAttribute("role", "tablist");
    switchWrap.setAttribute("aria-label", "Meal kit filter mode");

    const buttons = [
      createModeButton(MODES.HIGHLIGHT, "Highlight"),
      createModeButton(MODES.HIDE, "Hide"),
      createModeButton(MODES.OFF, "Off"),
    ];
    for (const button of buttons) {
      switchWrap.appendChild(button);
    }

    const status = document.createElement("span");
    status.id = "pal-mealkit-filter-status";
    status.className = "pal-mealkit-filter-status";
    status.textContent = latestStatusText;

    const barLeft = document.createElement("div");
    barLeft.className = "pal-mealkit-filter-bar-left";
    barLeft.append(label, switchWrap, status);

    const displayToggleBtn = document.createElement("button");
    displayToggleBtn.type = "button";
    displayToggleBtn.id = "pal-mealkit-display-toggle-btn";
    displayToggleBtn.className = "pal-mealkit-filter-display-btn";
    displayToggleBtn.textContent = "表示項目を減らす";
    displayToggleBtn.setAttribute("aria-pressed", "false");

    const trail = document.createElement("div");
    trail.className = "pal-mealkit-filter-bar-trail";
    trail.append(displayToggleBtn);

    bar.append(barLeft, trail);

    const section = mount.parentElement;
    if (section) {
      section.setAttribute("data-pal-mealkit-filter-host", "");
    }

    mount.insertBefore(bar, mount.firstChild);
    syncModeButtons();
    setupDisplayItemsToggle();
  }

  function syncDisplayToggleButtonFromCheckbox(checkbox) {
    const displayBtn = document.getElementById("pal-mealkit-display-toggle-btn");
    if (!displayBtn || !checkbox) {
      return;
    }
    const on = checkbox.checked;
    displayBtn.classList.toggle("is-active", on);
    displayBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function setupDisplayItemsToggle() {
    const section = findPrimaryMealKitSection();
    const displayBtn = document.getElementById("pal-mealkit-display-toggle-btn");
    if (!section || !displayBtn) {
      return;
    }

    const checkbox = section.querySelector('.vue-items-display-setting input[type="checkbox"]');
    if (!checkbox) {
      setTimeout(setupDisplayItemsToggle, 400);
      return;
    }

    if (section.dataset.palDisplayDelegate !== "1") {
      section.dataset.palDisplayDelegate = "1";
      section.addEventListener("change", (event) => {
        const target = event.target;
        if (
          target &&
          target.matches &&
          target.matches('.vue-items-display-setting input[type="checkbox"]')
        ) {
          syncDisplayToggleButtonFromCheckbox(target);
        }
      });
    }

    if (displayBtn.dataset.palDisplayClickBound !== "1") {
      displayBtn.dataset.palDisplayClickBound = "1";
      displayBtn.addEventListener("click", () => {
        const cb = section.querySelector('.vue-items-display-setting input[type="checkbox"]');
        if (cb) {
          cb.click();
        }
      });
    }

    syncDisplayToggleButtonFromCheckbox(checkbox);
  }

  function createModeButton(mode, text) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pal-mealkit-filter-switch-btn";
    button.dataset.mode = mode;
    button.textContent = text;
    button.addEventListener("click", () => {
      currentMode = mode;
      saveMode(currentMode);
      syncModeButtons();
      applyModeToAllItems();
    });
    return button;
  }

  function syncModeButtons() {
    const buttons = document.querySelectorAll(".pal-mealkit-filter-switch-btn");
    buttons.forEach((button) => {
      const active = button.dataset.mode === currentMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function updateStatus(text) {
    latestStatusText = text;
    const status = document.getElementById("pal-mealkit-filter-status");
    if (status) {
      status.textContent = text;
    }
  }

  function fetchTriedTitles() {
    return new Promise((resolve, reject) => {
      log("fetch start", PAPERLESS_API_URL);
      GM_xmlhttpRequest({
        method: "GET",
        url: PAPERLESS_API_URL,
        timeout: FETCH_TIMEOUT_MS,
        headers: {
          Authorization: `Token ${PAPERLESS_API_TOKEN}`,
          Accept: "application/json",
        },
        onload: (response) => {
          log("fetch onload", { status: response.status });
          if (response.status < 200 || response.status >= 300) {
            reject(new Error(`HTTP ${response.status}`));
            return;
          }

          try {
            const payload = JSON.parse(response.responseText);
            const results = Array.isArray(payload.results) ? payload.results : [];
            const titles = new Set();

            for (const doc of results) {
              if (doc && typeof doc.title === "string" && doc.title.trim()) {
                titles.add(normalizePaperlessTitle(doc.title));
              }
            }

            updateStatus(`Paperless: ${titles.size}件`);
            resolve(titles);
          } catch (error) {
            reject(error);
          }
        },
        onerror: () => reject(new Error("Network error")),
        ontimeout: () => reject(new Error(`Timeout after ${FETCH_TIMEOUT_MS}ms`)),
      });
    });
  }

  function fetchTriedTitlesWithRetry(retriesLeft) {
    return fetchTriedTitles().catch((error) => {
      if (retriesLeft <= 0) {
        throw error;
      }
      const nextRetriesLeft = retriesLeft - 1;
      log("fetch retry scheduled", { retriesLeft: nextRetriesLeft, error: String(error) });
      updateStatus(`Paperless再試行中... (${FETCH_RETRY_COUNT - nextRetriesLeft}/${FETCH_RETRY_COUNT})`);
      return new Promise((resolve) => setTimeout(resolve, 700)).then(() =>
        fetchTriedTitlesWithRetry(nextRetriesLeft)
      );
    });
  }

  function startWatchingForListUpdates() {
    const listRoot = getMealKitListRoot();
    if (!listRoot) {
      setTimeout(startWatchingForListUpdates, 1000);
      return;
    }

    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver(() => {
      log("mutation observed");
      applyModeToAllItems();
    });

    observer.observe(listRoot, {
      childList: true,
      subtree: true,
    });
  }

  function startPeriodicReapply() {
    if (reapplyTimer) {
      clearInterval(reapplyTimer);
    }
    reapplyTimer = setInterval(() => {
      injectControlBar();
      setupDisplayItemsToggle();
      if (hasLoadedTitles) {
        applyModeToAllItems();
      }
    }, REAPPLY_INTERVAL_MS);
  }

  function applyModeToAllItems() {
    const itemNodes = getMealKitItems();
    let matchedCount = 0;

    itemNodes.forEach((item) => {
      const matched = doesItemMatchTriedTitle(item);
      if (matched) {
        matchedCount += 1;
      }
      applyModeToItem(item, matched);
    });

    updateStatus(`一致: ${matchedCount}件 / 表示: ${itemNodes.length}件`);
    log("applied", { mode: currentMode, matchedCount, total: itemNodes.length });
  }

  function getMealKitItems() {
    const section = findPrimaryMealKitSection();
    const root = section || document;
    const allItems = root.querySelectorAll(".item-section-body .vue-item, .item-section-body .item-unit");
    return Array.from(allItems).filter((item) => item.querySelector(".item-name .name a"));
  }

  function doesItemMatchTriedTitle(itemNode) {
    const anchor = itemNode.querySelector(".item-name .name a");
    if (!anchor) {
      return false;
    }

    const rawName = (anchor.textContent || "").trim();
    const normalizedName = normalizeMealKitName(rawName);
    return triedTitles.has(normalizedName);
  }

  /** NFKC folds full-width digits (e.g. １ vs 1) so page text matches Paperless titles. */
  function normalizeComparableText(s) {
    return String(s).trim().normalize("NFKC");
  }

  function stripComparableTitleNoise(name) {
    let cleaned = String(name);
    for (const pattern of TITLE_NOISE_PATTERNS) {
      cleaned = cleaned.replace(pattern, "");
    }
    return cleaned.replace(/\s+/g, " ").trim();
  }

  function normalizeMealKitName(name) {
    let n = stripComparableTitleNoise(normalizeComparableText(name));
    return n.replace(TITLE_SUFFIX_REGEX, "").trim();
  }

  function normalizePaperlessTitle(name) {
    let cleaned = stripComparableTitleNoise(normalizeComparableText(name));
    if (!cleaned) {
      return cleaned;
    }
    return cleaned.endsWith("セット") ? cleaned : `${cleaned}セット`;
  }

  function applyModeToItem(itemNode, isMatch) {
    if (!itemNode.hasAttribute(ORIGINAL_STYLE_ATTR)) {
      itemNode.setAttribute(ORIGINAL_STYLE_ATTR, itemNode.getAttribute("style") || "");
    }

    itemNode.classList.remove("pal-mealkit-highlight");
    itemNode.style.display = "";
    itemNode.removeAttribute(MARK_ATTR);

    if (!isMatch || currentMode === MODES.OFF) {
      return;
    }

    itemNode.setAttribute(MARK_ATTR, "1");

    if (currentMode === MODES.HIDE) {
      itemNode.style.display = "none";
      return;
    }

    if (currentMode === MODES.HIGHLIGHT) {
      itemNode.classList.add("pal-mealkit-highlight");
    }
  }

  run();
})();
