// ==UserScript==
// @name         Pal System Meal Kit History Filter
// @namespace    mwsmws22
// @version      0.1.1
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
  const TITLE_SUBSTRINGS_TO_REMOVE = ["【冷凍】", "(4～5人分)"];
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
      .pal-mealkit-filter-bar {
        margin: 2px 0 18px;
        padding: 12px 14px;
        background: #f8fafc;
        border: 1px solid #cfd8e3;
        border-radius: 12px;
        box-shadow: 0 8px 20px rgba(16, 24, 40, 0.08);
        display: flex;
        align-items: center;
        gap: 14px;
        font-size: 14px;
        flex-wrap: wrap;
      }
      .pal-mealkit-filter-label {
        font-weight: 600;
        color: #2a2a2a;
      }
      .pal-mealkit-filter-switch {
        display: inline-flex;
        gap: 6px;
        padding: 6px;
        border-radius: 999px;
        background: #e9eef5;
        border: 1px solid #cfd8e3;
      }
      .pal-mealkit-filter-switch-btn {
        border: 0;
        border-radius: 999px;
        padding: 7px 16px;
        min-width: 76px;
        background: transparent;
        color: #344054;
        font-weight: 700;
        font-size: 12px;
        line-height: 1.2;
        cursor: pointer;
        transition: all 120ms ease;
      }
      .pal-mealkit-filter-switch-btn:hover {
        color: #1d2939;
      }
      .pal-mealkit-filter-switch-btn.is-active {
        background: #ffffff;
        color: #111827;
        box-shadow: 0 2px 8px rgba(16, 24, 40, 0.18);
      }
      .pal-mealkit-filter-status {
        color: #475467;
        font-size: 12px;
      }
      @media (prefers-color-scheme: dark) {
        .pal-mealkit-filter-bar {
          background: #1f2631;
          border-color: #3a4655;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
        }
        .pal-mealkit-filter-label {
          color: #f2f4f7;
        }
        .pal-mealkit-filter-switch {
          background: #2a3342;
          border-color: #435066;
        }
        .pal-mealkit-filter-switch-btn {
          color: #d0d5dd;
        }
        .pal-mealkit-filter-switch-btn:hover {
          color: #f2f4f7;
        }
        .pal-mealkit-filter-switch-btn.is-active {
          background: #3a4a61;
          color: #ffffff;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
        }
        .pal-mealkit-filter-status {
          color: #c7d0dd;
        }
      }
      .pal-mealkit-highlight {
        background: #fff3a0 !important;
      }
    `;
    document.head.appendChild(style);
  }

  function getItemSectionInner() {
    return document.querySelector(".item-section-body > .inner");
  }

  function injectControlBar() {
    if (document.getElementById("pal-mealkit-filter-bar")) {
      return;
    }

    const itemSectionInner = getItemSectionInner();
    if (!itemSectionInner) {
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
    syncModeButtons();

    const status = document.createElement("span");
    status.id = "pal-mealkit-filter-status";
    status.className = "pal-mealkit-filter-status";
    status.textContent = latestStatusText;

    bar.append(label, switchWrap, status);
    itemSectionInner.insertBefore(bar, itemSectionInner.firstChild);
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
    const listRoot = document.querySelector(".item-section-body .vue-items.item-list");
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
    const allItems = document.querySelectorAll(".item-section-body .vue-item, .item-section-body .item-unit");
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

  function normalizeMealKitName(name) {
    return stripTitleSubstrings(normalizeComparableText(name))
      .replace(TITLE_SUFFIX_REGEX, "")
      .trim();
  }

  function normalizePaperlessTitle(name) {
    const cleaned = normalizeComparableText(name);
    if (!cleaned) {
      return cleaned;
    }
    return cleaned.endsWith("セット") ? cleaned : `${cleaned}セット`;
  }

  function stripTitleSubstrings(name) {
    let result = String(name).trim();
    for (const token of TITLE_SUBSTRINGS_TO_REMOVE) {
      result = result.split(token).join("");
    }
    return result.trim();
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
