// ==UserScript==
// @name         Better Bunpro
// @namespace    mwsmws22
// @version      0.1.2
// @author       mwsmws22
// @description  Features I wish Bunpro had. Show example sentences for A1+ vocab after a correct answer, and more.
// @license      MIT
// @match        https://bunpro.jp/*
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function() {
	"use strict";
	var _GM_getValue = (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
	var _GM_registerMenuCommand = (() => typeof GM_registerMenuCommand != "undefined" ? GM_registerMenuCommand : void 0)();
	var _GM_setValue = (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
	var listeners = new Set();
	function readStored(key, fallback) {
		const stored = _GM_getValue(key, void 0);
		return stored === void 0 ? fallback : stored;
	}
	function writeStored(key, value) {
		_GM_setValue(key, value);
		for (const listener of listeners) listener(key);
	}
	var features = [];
	var running = new Set();
	function registerFeature(feature) {
		features.push(feature);
	}
	function listFeatures() {
		return features;
	}
	function isFeatureEnabled(feature) {
		return readStored(enabledKey(feature), feature.enabledByDefault);
	}
	function setFeatureEnabled(feature, enabled) {
		writeStored(enabledKey(feature), enabled);
		syncFeature(feature);
	}
	function startEnabledFeatures() {
		for (const feature of features) syncFeature(feature);
	}
	function syncFeature(feature) {
		const shouldRun = isFeatureEnabled(feature);
		if (shouldRun === running.has(feature.id)) return;
		if (shouldRun) {
			feature.start();
			running.add(feature.id);
		} else {
			feature.stop();
			running.delete(feature.id);
		}
	}
	function enabledKey(feature) {
		return `feature.${feature.id}.enabled`;
	}
	var API_BASE = "https://api.bunpro.jp/api/frontend";
	var TOKEN_COOKIE = "frontend_api_token";
	var LOCALE_COOKIE = "locale";
	var inFlight = new Map();
	function fetchStudyQuestions(reviewable) {
		const key = `${reviewable.type}:${reviewable.id}`;
		let request = inFlight.get(key);
		if (!request) {
			request = requestStudyQuestions(reviewable);
			inFlight.set(key, request);
		}
		return request;
	}
	async function requestStudyQuestions(reviewable) {
		const token = readCookie(TOKEN_COOKIE);
		if (!token) throw new Error(`No ${TOKEN_COOKIE} cookie found; are you signed in to Bunpro?`);
		const locale = readCookie(LOCALE_COOKIE) ?? "en";
		const url = `${API_BASE}/reviewables/${reviewable.type}/${reviewable.id}?locale=${locale}`;
		const response = await fetch(url, {
			credentials: "omit",
			headers: {
				Accept: "application/json",
				Authorization: `Token token=${token}`
			}
		});
		if (!response.ok) throw new Error(`${url} responded ${response.status}`);
		return collectStudyQuestions(await response.json());
	}
	function collectStudyQuestions(payload) {
		const sentences = [];
		for (const entry of payload.included ?? []) {
			if (entry.type !== "study_question" || !entry.attributes) continue;
			const attributes = entry.attributes;
			if (typeof attributes.content !== "string") continue;
			sentences.push({
				...attributes,
				id: typeof attributes.id === "number" ? attributes.id : Number(entry.id)
			});
		}
		return sentences.sort(bySentenceOrder);
	}
	function bySentenceOrder(left, right) {
		return (left.sentence_order ?? Number.MAX_SAFE_INTEGER) - (right.sentence_order ?? Number.MAX_SAFE_INTEGER);
	}
	function readCookie(name) {
		for (const pair of document.cookie.split(";")) {
			const separator = pair.indexOf("=");
			if (separator === -1) continue;
			if (pair.slice(0, separator).trim() !== name) continue;
			const value = decodeURIComponent(pair.slice(separator + 1)).trim();
			return value === "" ? null : value;
		}
		return null;
	}
	var QUIZ_ARTICLE = "#js-quiz article:not(.bp-reviewable-root)";
	function findQuestionSection() {
		return document.querySelector(`${QUIZ_ARTICLE} > section`);
	}
	function hasNativeSentenceCard() {
		return document.querySelector(`${QUIZ_ARTICLE} > section aside[id^="study-question-"]`) !== null;
	}
	function findQuizToolbar() {
		const rows = document.querySelectorAll(`${QUIZ_ARTICLE} > header ul`);
		for (const row of rows) if (row.querySelector("button, a")) return row;
		return null;
	}
	var METADATA_ID = "quiz-metadata-element";
	var NO_QUIZ = {
		sessionId: null,
		reviewable: null,
		questionMode: null,
		isRevealing: false,
		isCorrect: false
	};
	function readQuizState() {
		const element = document.getElementById(METADATA_ID);
		if (!element) return NO_QUIZ;
		return {
			sessionId: element.getAttribute("data-meta-session-id"),
			reviewable: parseReviewable(element.getAttribute("data-meta-info")),
			questionMode: element.getAttribute("data-meta-question-mode"),
			isRevealing: element.getAttribute("data-meta-is-revealing") === "true",
			isCorrect: element.getAttribute("data-meta-is-correct") === "true"
		};
	}
	function watchQuizState(onChange) {
		let boundElement = null;
		let attributeObserver = null;
		let lastSignature = "";
		const emitIfChanged = () => {
			const state = readQuizState();
			const signature = JSON.stringify(state);
			if (signature === lastSignature) return;
			lastSignature = signature;
			onChange(state);
		};
		const bindToMetadataElement = () => {
			const element = document.getElementById(METADATA_ID);
			if (element === boundElement) return;
			attributeObserver?.disconnect();
			boundElement = element;
			if (element) {
				attributeObserver = new MutationObserver(emitIfChanged);
				attributeObserver.observe(element, { attributes: true });
			}
			emitIfChanged();
		};
		const treeObserver = new MutationObserver(bindToMetadataElement);
		treeObserver.observe(document.body, {
			childList: true,
			subtree: true
		});
		bindToMetadataElement();
		return () => {
			treeObserver.disconnect();
			attributeObserver?.disconnect();
		};
	}
	function parseReviewable(raw) {
		if (!raw || raw === "null") return null;
		try {
			const { id, type } = JSON.parse(raw);
			if (typeof id !== "number" || type !== "vocab" && type !== "grammar_point") return null;
			return {
				id,
				type
			};
		} catch {
			return null;
		}
	}
	var STYLE_ID = "bb-styles";
	var CSS = `
.bb-sentence-slot {
  min-width: min(100%, 31.25rem);
  min-height: 5.6875rem;
}
@media (min-width: 640px) {
  .bb-sentence-slot {
    min-width: max(fit-content, 31.25rem);
    min-height: 6.875rem;
  }
}
.bb-backdrop {
  background: rgb(0 0 0 / 0.5);
}
.bb-panel-card {
  width: min(100%, 34rem);
  max-height: min(80dvh, 40rem);
}
.bb-switch {
  position: relative;
  flex-shrink: 0;
  width: 2.75rem;
  height: 1.5rem;
  border-radius: 9999px;
  transition: background-color 150ms ease;
}
.bb-switch::after {
  content: '';
  position: absolute;
  top: 0.1875rem;
  left: 0.1875rem;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 9999px;
  background: rgb(var(--c-primary-bg) / 1);
  transition: transform 150ms ease;
}
.bb-switch[aria-checked='true']::after {
  transform: translateX(1.25rem);
}
`;
	function injectStyles() {
		if (document.getElementById(STYLE_ID)) return;
		const style = document.createElement("style");
		style.id = STYLE_ID;
		style.textContent = CSS;
		document.head.append(style);
	}
	var KANJI = `${String.raw`\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5`}${String.raw`\u3005\u3007\u3021-\u3029\u3038-\u303B`}${String.raw`\u3400-\u4DBF\u4E00-\u9FFF`}${String.raw`\uF900-\uFA6D\uFA70-\uFAD9`}`;
	var HIRAGANA = String.raw`\u3041-\u3096\u309D-\u309F`;
	var JAPANESE = `${KANJI}${HIRAGANA}${String.raw`\u30A0-\u30FF\u30FC`}`;
	var ANNOTATABLE = `${KANJI}\\u30F6`;
	var FULL_WIDTH_DIGITS = String.raw`\uFF10-\uFF19`;
	var FULL_WIDTH_ALNUM = String.raw`\uFF21-\uFF3A\uFF41-\uFF5A${FULL_WIDTH_DIGITS}`;
	var FULL_WIDTH_COMMA = String.raw`\uFF0C`;
	var SYMBOLS = String.raw`\uFF0E\uFF1A\u30FC\u301C\uFF05\uFF06\uFF20\u21D2\u2103\uFF0B\u03B2`;
	var OPEN_PAREN = String.raw`\uFF08`;
	var CLOSE_PAREN = String.raw`\uFF09`;
	var annotated = `((?:${`[${FULL_WIDTH_ALNUM}]*[${ANNOTATABLE}]*[${HIRAGANA}]*`}?)|(?:${`[${FULL_WIDTH_DIGITS}]+(?:${FULL_WIDTH_COMMA}[${FULL_WIDTH_DIGITS}]+)+`})|(?:[${SYMBOLS}]))`;
	var FURIGANA_PAIR = new RegExp(`${annotated}${OPEN_PAREN}([${JAPANESE}]*)${CLOSE_PAREN}`, "g");
	var NON_JAPANESE = new RegExp(`[^${JAPANESE}]`);
	var STARTS_ANNOTATABLE = new RegExp(`^[${ANNOTATABLE}]`);
	var ALL_FULL_WIDTH = new RegExp(`^[${FULL_WIDTH_ALNUM}${SYMBOLS}${FULL_WIDTH_COMMA}]+$`);
	function furiganaToRuby(text) {
		return text.replace(FURIGANA_PAIR, (pair, base, reading) => canAnnotate(base, reading) ? toRuby(base, reading) : pair);
	}
	function canAnnotate(base, reading) {
		if (base === "" || reading === "" || NON_JAPANESE.test(reading)) return false;
		return STARTS_ANNOTATABLE.test(base) || ALL_FULL_WIDTH.test(base);
	}
	function toRuby(base, reading) {
		return `<ruby>${base}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`;
	}
	var BLANK = "____";
	function studyQuestionToHtml(sentence) {
		return furiganaToRuby(withAnswerFilledIn(sentence));
	}
	function withAnswerFilledIn(sentence) {
		const answer = sentence.kanji_answer || sentence.answer;
		if (!answer || !sentence.content.includes(BLANK)) return sentence.content;
		return sentence.content.replaceAll(BLANK, `<span class="text-primary-accent">${answer}</span>`);
	}
	var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
	function element(tag, attributes = {}, children = []) {
		const node = document.createElement(tag);
		for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
		node.append(...children);
		return node;
	}
	function svgIcon(className, shapes) {
		const node = document.createElementNS(SVG_NAMESPACE, "svg");
		node.setAttribute("viewBox", "0 0 24 24");
		node.setAttribute("class", className);
		node.setAttribute("aria-hidden", "true");
		node.innerHTML = shapes;
		return node;
	}
	var SLOT_CLASS = "bb-sentence-slot mx-auto mt-8 w-fit sm:mt-0 animate-fade-in";
	var CARD_CLASS$1 = "not-prose relative my-0 block overflow-hidden rounded-normal border align-top sm:flex sm:items-center sm:justify-between gap-8 px-12 py-8 sm:p-16 sm:gap-12 sm:pt-12 bg-tertiary-bg/50 border-rim";
	var TEXT_COLUMN_CLASS = "relative z-1 flex grow flex-col items-center justify-center gap-4 text-center";
	var JAPANESE_CLASS = "bp-ddw text-body sm:text-large prose w-full";
	var ENGLISH_CLASS = "bp-sdw text-extra-small sm:text-body prose w-full";
	var PLAY_CIRCLE_PATH = "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 13.5v-7a.5.5 0 0 1 .8-.4l4.67 3.5c.27.2.27.6 0 .8l-4.67 3.5a.5.5 0 0 1-.8-.4";
	var CARD_MARKER = "data-bb-sentence-card";
	function buildSentenceCard(sentence) {
		const japanese = element("p", {
			class: JAPANESE_CLASS,
			"data-force-furigana": "default"
		});
		japanese.innerHTML = studyQuestionToHtml(sentence);
		const english = element("p", { class: ENGLISH_CLASS }, [sentence.translation ?? ""]);
		const textColumn = element("div", { class: TEXT_COLUMN_CLASS }, [japanese, english]);
		const audioUrl = sentence.female_audio_url ?? sentence.male_audio_url;
		const card = element("aside", {
			class: CARD_CLASS$1,
			"data-bb-study-question": String(sentence.id)
		}, audioUrl ? [buildAudioButton(audioUrl), textColumn] : [textColumn]);
		return element("div", {
			class: SLOT_CLASS,
			[CARD_MARKER]: ""
		}, [card]);
	}
	function buildAudioButton(audioUrl) {
		const button = element("button", {
			class: "block transition-opacity text-primary-accent",
			title: "Play audio"
		}, [element("div", {
			class: "bp-hover-bg__child rounded-normal",
			style: "font-size: 1.625rem;"
		}, [element("div", {
			class: "relative flex items-center justify-center",
			style: "width: 1em; height: 1em;"
		}, [svgIcon("h-24 w-24", `<path d="${PLAY_CIRCLE_PATH}" fill="currentColor"/>`)])])]);
		button.addEventListener("click", () => void new Audio(audioUrl).play().catch(() => void 0));
		return element("ul", { class: "relative z-1 hidden sm:flex sm:items-center sm:gap-4" }, [element("li", {}, [button])]);
	}
	var ROTATION_KEY = "exampleSentence.rotation";
	function pickSentenceIndex(termKey, sessionId, count) {
		const table = readStored(ROTATION_KEY, {});
		const previous = table[termKey];
		const index = nextIndex(previous, sessionId, count);
		if (previous?.index !== index || previous.sessionId !== sessionId) {
			table[termKey] = {
				index,
				sessionId
			};
			writeStored(ROTATION_KEY, table);
		}
		return index;
	}
	function nextIndex(previous, sessionId, count) {
		if (!previous) return 0;
		if (previous.sessionId === sessionId) return previous.index % count;
		return (previous.index + 1) % count;
	}
	var stopWatchingQuiz = null;
	var sectionObserver = null;
	var mountedFor = null;
	var hasWarned = false;
	var exampleSentenceFeature = {
		id: "example-sentence",
		title: "Show unverified example sentences for A1+ vocab",
		description: "Bunpro does not show unverified example sentences for A1+ vocab in reviews, even though they are present (this is available on mobile). After a correct answer, this shows one of those sentences and cycles through them each review session.",
		enabledByDefault: true,
		start() {
			injectStyles();
			stopWatchingQuiz = watchQuizState(onQuizStateChange);
		},
		stop() {
			stopWatchingQuiz?.();
			stopWatchingQuiz = null;
			unmountCard();
		}
	};
	function onQuizStateChange(state) {
		const term = termNeedingSentence(state);
		if (!term || !state.sessionId) {
			unmountCard();
			return;
		}
		const mountKey = mountKeyFor(term, state.sessionId);
		if (mountedFor === mountKey) return;
		unmountCard();
		mountSentenceFor(term, state.sessionId);
	}
	function termNeedingSentence(state) {
		if (state.reviewable?.type !== "vocab" || state.questionMode !== "translate") return null;
		if (!state.isRevealing || !state.isCorrect || hasNativeSentenceCard()) return null;
		return state.reviewable;
	}
	async function mountSentenceFor(term, sessionId) {
		const mountKey = mountKeyFor(term, sessionId);
		const sentences = await loadSentences(term);
		if (sentences.length === 0 || currentMountKey() !== mountKey) return;
		const sentence = sentences[pickSentenceIndex(termKey(term), sessionId, sentences.length)];
		if (sentence) mountCard(mountKey, sentence);
	}
	async function loadSentences(term) {
		try {
			return await fetchStudyQuestions(term);
		} catch (error) {
			if (!hasWarned) {
				hasWarned = true;
				console.warn("[Better Bunpro] Could not load example sentences:", error);
			}
			return [];
		}
	}
	function mountCard(mountKey, sentence) {
		const section = findQuestionSection();
		if (!section) return;
		section.append(buildSentenceCard(sentence));
		mountedFor = mountKey;
		remountIfReactReplacesSection(section, mountKey, sentence);
	}
	function remountIfReactReplacesSection(section, mountKey, sentence) {
		sectionObserver?.disconnect();
		sectionObserver = new MutationObserver(() => {
			if (mountedFor !== mountKey || section.querySelector(`[data-bb-sentence-card]`)) return;
			section.append(buildSentenceCard(sentence));
		});
		sectionObserver.observe(section, { childList: true });
	}
	function unmountCard() {
		sectionObserver?.disconnect();
		sectionObserver = null;
		mountedFor = null;
		for (const card of document.querySelectorAll(`[${CARD_MARKER}]`)) card.remove();
	}
	function currentMountKey() {
		const state = readQuizState();
		const term = termNeedingSentence(state);
		return term && state.sessionId ? mountKeyFor(term, state.sessionId) : null;
	}
	function mountKeyFor(term, sessionId) {
		return `${termKey(term)}@${sessionId}`;
	}
	function termKey(term) {
		return `${term.type}:${term.id}`;
	}
	var PANEL_ID = "bb-settings-panel";
	var CARD_CLASS = "bb-panel-card relative z-1 flex flex-col overflow-hidden rounded-normal border border-rim bg-secondary-bg text-primary-fg shadow-normal";
	var CLOSE_SHAPES = "<path d=\"M6 6 18 18M18 6 6 18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>";
	function toggleSettingsPanel() {
		const open = document.getElementById(PANEL_ID);
		if (open) {
			open.remove();
			return;
		}
		injectStyles();
		const panel = buildPanel();
		document.body.append(panel);
		panel.querySelector(".bb-panel-card")?.focus();
	}
	function closePanel() {
		document.getElementById(PANEL_ID)?.remove();
	}
	function buildPanel() {
		const backdrop = element("button", {
			class: "bb-backdrop absolute inset-0",
			"aria-label": "Close settings"
		});
		backdrop.addEventListener("click", closePanel);
		const card = element("div", {
			class: CARD_CLASS,
			tabindex: "-1"
		}, [buildHeader(), element("div", { class: "grow overflow-y-auto p-16" }, [buildFeatureList()])]);
		const panel = element("div", {
			id: PANEL_ID,
			class: "fixed inset-0 z-modal flex items-center justify-center p-16",
			role: "dialog",
			"aria-modal": "true"
		}, [backdrop, card]);
		panel.addEventListener("keydown", (event) => {
			event.stopPropagation();
			if (event.key === "Escape") closePanel();
		});
		return panel;
	}
	function buildHeader() {
		const close = element("button", {
			class: "text-primary-accent",
			title: "Close",
			"aria-label": "Close"
		}, [svgIcon("h-24 w-24", CLOSE_SHAPES)]);
		close.addEventListener("click", closePanel);
		return element("header", { class: "flex items-center justify-between gap-16 border-b border-rim p-16" }, [element("h2", { class: "text-large font-bold" }, ["Better Bunpro"]), close]);
	}
	function buildFeatureList() {
		return element("ul", { class: "grid gap-16" }, listFeatures().map(buildFeatureRow));
	}
	function buildFeatureRow(feature) {
		return element("li", { class: "flex items-start justify-between gap-16" }, [element("div", { class: "grid gap-2" }, [element("p", { class: "font-bold" }, [feature.title]), element("p", { class: "text-small text-tertiary-fg" }, [feature.description])]), buildSwitch(feature)]);
	}
	function buildSwitch(feature) {
		const button = element("button", {
			role: "switch",
			"aria-label": feature.title
		});
		const paint = () => {
			const enabled = isFeatureEnabled(feature);
			button.setAttribute("aria-checked", String(enabled));
			button.className = `bb-switch ${enabled ? "bg-primary-accent" : "bg-tertiary-bg"}`;
		};
		button.addEventListener("click", () => {
			setFeatureEnabled(feature, !isFeatureEnabled(feature));
			paint();
		});
		paint();
		return button;
	}
	var LAUNCHER_MARKER = "data-bb-launcher";
	var TUNE_SHAPES = `<g fill="currentColor">
  <rect x="3" y="6" width="18" height="2" rx="1"/>
  <rect x="3" y="16" width="18" height="2" rx="1"/>
  <circle cx="9" cy="7" r="3.25"/>
  <circle cx="15" cy="17" r="3.25"/>
</g>`;
	function mountSettingsLaunchers() {
		_GM_registerMenuCommand("Settings", toggleSettingsPanel);
		keepToolbarButtonMounted();
	}
	function keepToolbarButtonMounted() {
		const mount = () => {
			const toolbar = findQuizToolbar();
			if (!toolbar || toolbar.querySelector(`[${LAUNCHER_MARKER}]`)) return;
			toolbar.append(buildToolbarButton());
		};
		new MutationObserver(mount).observe(document.body, {
			childList: true,
			subtree: true
		});
		mount();
	}
	function buildToolbarButton() {
		const icon = svgIcon("h-24 w-24", TUNE_SHAPES);
		icon.setAttribute("style", "width: 0.666667em; height: 0.666667em;");
		const button = element("button", {
			class: "block",
			title: "Better Bunpro settings",
			"aria-haspopup": "dialog"
		}, [element("div", {
			class: "bp-hover-bg__child rounded-normal",
			style: "font-size: 2.25rem;"
		}, [element("div", {
			class: "relative flex items-center justify-center",
			style: "width: 1em; height: 1em;"
		}, [icon])])]);
		button.addEventListener("click", toggleSettingsPanel);
		return element("li", { [LAUNCHER_MARKER]: "" }, [button]);
	}
	registerFeature(exampleSentenceFeature);
	mountSettingsLaunchers();
	startEnabledFeatures();
})();
