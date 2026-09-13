// ==UserScript==
// @name         Better Bunpro
// @namespace    mwsmws22
// @version      0.4.0
// @author       mwsmws22
// @description  Features I wish Bunpro had. Show example sentences for A1+ vocab after a correct answer, cycle sentences with Tab, keep guessing after a wrong answer, play real speakers instead of synthesised term audio, and more.
// @license      MIT
// @match        https://bunpro.jp/*
// @connect      assets.languagepod101.com
// @connect      www.japanesepod101.com
// @connect      cdn.innovativelanguage.com
// @connect      jisho.org
// @connect      d1vjc5dkcd3yh2.cloudfront.net
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function() {
	"use strict";
	var _GM_getValue = (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
	var _GM_registerMenuCommand = (() => typeof GM_registerMenuCommand != "undefined" ? GM_registerMenuCommand : void 0)();
	var _GM_setValue = (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
	var _GM_xmlhttpRequest = (() => typeof GM_xmlhttpRequest != "undefined" ? GM_xmlhttpRequest : void 0)();
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
	var QUIZ_ARTICLE = "#js-quiz article:not(.bp-reviewable-root)";
	function findQuizArticle() {
		return document.querySelector(QUIZ_ARTICLE);
	}
	function findQuestionSection() {
		return document.querySelector(`${QUIZ_ARTICLE} > section`);
	}
	function findClozeSentence() {
		return document.querySelector(`${QUIZ_ARTICLE} .bp-quiz-question > .text-center`);
	}
	function findClozeTense() {
		return document.querySelector(`${QUIZ_ARTICLE} .bp-quiz-question > p.bp-quiz-tense`);
	}
	function findQuestionTranslation() {
		return document.querySelector(`${QUIZ_ARTICLE} .bp-quiz-trans:not(.bp-quiz-trans--hint)`);
	}
	var NATIVE_CARD_ID_PREFIX = "study-question-";
	function findNativeSentenceCard() {
		return document.querySelector(`${QUIZ_ARTICLE} > section aside[id^="${NATIVE_CARD_ID_PREFIX}"]`);
	}
	function hasNativeSentenceCard() {
		return findNativeSentenceCard() !== null;
	}
	function nativeSentenceId() {
		const card = findNativeSentenceCard();
		if (!card) return null;
		const id = Number(card.id.slice(15));
		return Number.isFinite(id) ? id : null;
	}
	function findAnswerInput() {
		return document.querySelector("#js-manual-input");
	}
	function findSubmitButton() {
		return document.querySelector(".InputManual__button");
	}
	function findAnswerConsole() {
		return document.querySelector(".InputManual");
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
		inputMode: null,
		answers: [],
		isPostAttempt: false,
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
			inputMode: element.getAttribute("data-meta-input-mode"),
			answers: parseAnswers(element.getAttribute("data-meta-answers-array")),
			isPostAttempt: element.getAttribute("data-meta-is-post-attempt") === "true",
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
	function parseAnswers(raw) {
		if (!raw || raw === "null") return [];
		try {
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed)) return [];
			return parsed.filter((answer) => typeof answer === "string");
		} catch {
			return [];
		}
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
	function termKey(term) {
		return `${term.type}:${term.id}`;
	}
	function reviewKey(state) {
		const { reviewable, sessionId } = state;
		return reviewable && sessionId ? `${termKey(reviewable)}@${sessionId}` : null;
	}
	var API_BASE = "https://api.bunpro.jp/api/frontend";
	var TOKEN_COOKIE = "frontend_api_token";
	var LOCALE_COOKIE = "locale";
	var inFlight = new Map();
	function fetchItem(reviewable) {
		const key = `${reviewable.type}:${reviewable.id}`;
		let request = inFlight.get(key);
		if (!request) {
			request = requestItem(reviewable);
			inFlight.set(key, request);
		}
		return request;
	}
	async function fetchStudyQuestions(reviewable) {
		return collectStudyQuestions(await fetchItem(reviewable));
	}
	async function fetchReviewable(reviewable) {
		const attributes = (await fetchItem(reviewable)).data?.attributes;
		return attributes ? attributes : null;
	}
	async function requestItem(reviewable) {
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
		return await response.json();
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
	var reported = new Set();
	function warnOnce(topic, message, error) {
		if (reported.has(topic)) return;
		reported.add(topic);
		console.warn(`[Better Bunpro] ${message}`, error);
	}
	async function loadSentences(term) {
		try {
			return await fetchStudyQuestions(term);
		} catch (error) {
			warnOnce("sentences", "Could not load example sentences:", error);
			return [];
		}
	}
	function solvedReviewKey(state) {
		return state.isRevealing && state.isCorrect ? reviewKey(state) : null;
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
	var KANJI = `${String.raw`\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5`}${String.raw`\u3005\u3007\u3021-\u3029\u3038-\u303B`}${String.raw`\u3400-\u4DBF\u4E00-\u9FFF`}${String.raw`\uF900-\uFA6D\uFA70-\uFAD9`}`;
	var HIRAGANA = String.raw`\u3041-\u3096\u309D-\u309F`;
	var KATAKANA = String.raw`\u30A0-\u30FF\u30FC`;
	var JAPANESE = `${KANJI}${HIRAGANA}${KATAKANA}`;
	var JAPANESE_CHARACTER = new RegExp(`^[${JAPANESE}]$`);
	var KANA_THROUGHOUT = new RegExp(`^[${HIRAGANA}${KATAKANA}]+$`);
	function isJapanese(character) {
		return JAPANESE_CHARACTER.test(character);
	}
	function isEntirelyKana(text) {
		return KANA_THROUGHOUT.test(text);
	}
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
		const answer = answerOf(sentence);
		if (!answer || !sentence.content.includes(BLANK)) return sentence.content;
		return sentence.content.replaceAll(BLANK, `<span class="text-primary-accent">${answer}</span>`);
	}
	function questionSentenceParts(sentence) {
		const prompt = sentence.word_prompt ? `(${sentence.word_prompt})` : "";
		return `${sentence.content}${prompt}`.split(BLANK).map(furiganaToRuby);
	}
	function sentenceAnswerHtml(sentence) {
		return furiganaToRuby(answerOf(sentence) ?? "");
	}
	function answerOf(sentence) {
		return sentence.kanji_answer || sentence.answer;
	}
	var SHARED_CARD_CLASS = "not-prose relative my-0 block overflow-hidden rounded-normal border align-top sm:flex sm:items-center sm:justify-between bg-tertiary-bg/50 border-rim";
	var EXAMPLES_CARD = {
		cardClass: `${SHARED_CARD_CLASS} sm:gap-4 px-16 pt-12 pb-16 sm:px-24 sm:pt-16 sm:pb-24`,
		japaneseClass: "bp-ddw text-large md:text-subtitle prose w-full",
		englishClass: "bp-sdw text-body prose w-full",
		audioFontSize: "2.25rem"
	};
	var QUIZ_CARD = {
		cardClass: `${SHARED_CARD_CLASS} gap-8 px-12 py-8 sm:p-16 sm:gap-12 sm:pt-12`,
		japaneseClass: "bp-ddw text-body sm:text-large prose w-full",
		englishClass: "bp-sdw text-extra-small sm:text-body prose w-full",
		audioFontSize: "1.625rem"
	};
	var TEXT_COLUMN_CLASS = "relative z-1 flex grow flex-col items-center justify-center gap-4 text-center";
	var PLAY_CIRCLE_PATH = "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 13.5v-7a.5.5 0 0 1 .8-.4l4.67 3.5c.27.2.27.6 0 .8l-4.67 3.5a.5.5 0 0 1-.8-.4";
	function buildSentenceCard(sentence, preset) {
		const japanese = element("p", {
			class: preset.japaneseClass,
			"data-force-furigana": "default"
		});
		japanese.innerHTML = studyQuestionToHtml(sentence);
		const english = element("p", { class: preset.englishClass });
		english.innerHTML = sentence.translation ?? "";
		const textColumn = element("div", { class: TEXT_COLUMN_CLASS }, [japanese, english]);
		const audioUrl = sentence.female_audio_url ?? sentence.male_audio_url;
		const children = audioUrl ? [buildAudioButton(audioUrl, preset.audioFontSize), textColumn] : [textColumn];
		return element("aside", {
			class: preset.cardClass,
			"data-bb-study-question": String(sentence.id)
		}, children);
	}
	function buildAudioButton(audioUrl, fontSize) {
		const icon = svgIcon("h-24 w-24", `<path d="${PLAY_CIRCLE_PATH}" fill="currentColor"/>`);
		const button = element("button", {
			class: "block transition-opacity text-primary-accent",
			title: "Play audio"
		}, [element("div", {
			class: "bp-hover-bg__child rounded-normal",
			style: `font-size: ${fontSize};`
		}, [element("div", {
			class: "relative flex items-center justify-center",
			style: "width: 1em; height: 1em;"
		}, [icon])])]);
		button.addEventListener("click", () => void new Audio(audioUrl).play().catch(() => void 0));
		return element("ul", { class: "relative z-1 hidden sm:flex sm:items-center sm:gap-4" }, [element("li", {}, [button])]);
	}
	var OURS = "data-bb-ours";
	var HIDDEN_BY_US = "data-bb-hidden";
	function markAsOurs(node) {
		node.setAttribute(OURS, "");
		return node;
	}
	function paintStandIns(standIns) {
		for (const standIn of standIns) {
			const original = standIn.hides?.() ?? null;
			if (original) hide(original);
			if (standIn.ours.isConnected) continue;
			if (original) original.after(standIn.ours);
			else standIn.appendTo?.()?.append(standIn.ours);
		}
	}
	function removeStandIns() {
		for (const ours of document.querySelectorAll(`[${OURS}]`)) ours.remove();
		for (const hidden of document.querySelectorAll(`[${HIDDEN_BY_US}]`)) {
			hidden.style.removeProperty("display");
			hidden.removeAttribute(HIDDEN_BY_US);
		}
	}
	function hide(node) {
		if (node.style.display !== "none") {
			node.style.display = "none";
			node.setAttribute(HIDDEN_BY_US, "");
		}
	}
	function buildClozeStandIns(sentence) {
		const originalSentence = findClozeSentence();
		if (!originalSentence) return [];
		const standIns = [{
			ours: markAsOurs(buildSentence(originalSentence, sentence)),
			hides: findClozeSentence
		}];
		const originalTense = findClozeTense();
		if (originalTense) standIns.push({
			ours: markAsOurs(refilled(originalTense, sentence.tense ?? "")),
			hides: findClozeTense
		});
		const originalTranslation = findQuestionTranslation();
		if (originalTranslation) standIns.push({
			ours: markAsOurs(refilled(originalTranslation, sentence.translation ?? "")),
			hides: findQuestionTranslation
		});
		return standIns;
	}
	function buildSentence(original, sentence) {
		const line = shallowClone(original);
		const parts = questionSentenceParts(sentence);
		parts.forEach((part, index) => {
			line.append(refilled(partTemplate(original), part));
			if (index < parts.length - 1) line.append(buildBlank(original, sentence));
		});
		return line;
	}
	function buildBlank(original, sentence) {
		const answer = sentenceAnswerHtml(sentence);
		const template = original.querySelector(":scope > button");
		if (!template) return refilled(partTemplate(original), answer);
		const blank = element("span", { class: template.className });
		const inner = template.querySelector("span");
		if (inner) blank.append(refilled(inner, answer));
		else blank.innerHTML = answer;
		return blank;
	}
	function partTemplate(original) {
		return original.querySelector(":scope > span") ?? element("span", {
			class: "bp-ddw wrap-anywhere",
			"data-force-furigana": "default"
		});
	}
	function refilled(template, html) {
		const clone = shallowClone(template);
		clone.innerHTML = html;
		return clone;
	}
	function shallowClone(node) {
		const clone = node.cloneNode(false);
		clone.style.removeProperty("display");
		return clone;
	}
	var SLOT_CLASS = "bb-sentence-slot mx-auto w-fit animate-fade-in";
	var mounted = null;
	var repaintObserver = null;
	function shownSentence() {
		return mounted;
	}
	function showSentence(shown) {
		const sentence = shown.sentences[shown.index];
		if (!sentence) return;
		clearSentence();
		const standIns = buildStandIns(sentence);
		if (standIns.length === 0) return;
		mounted = {
			...shown,
			standIns
		};
		paintStandIns(standIns);
		repaintWhenBunproRerenders();
	}
	function clearSentence() {
		repaintObserver?.disconnect();
		repaintObserver = null;
		mounted = null;
		removeStandIns();
	}
	function dropSentenceUnless(reviewKey) {
		if (mounted && mounted.reviewKey !== reviewKey) clearSentence();
	}
	function buildStandIns(sentence) {
		if (findNativeSentenceCard()) return [{
			ours: markAsOurs(buildSentenceCard(sentence, QUIZ_CARD)),
			hides: findNativeSentenceCard
		}];
		if (findClozeSentence()) return buildClozeStandIns(sentence);
		return [{
			ours: markAsOurs(element("div", { class: SLOT_CLASS }, [buildSentenceCard(sentence, EXAMPLES_CARD)])),
			appendTo: findQuestionSection
		}];
	}
	function repaintWhenBunproRerenders() {
		const article = findQuizArticle();
		if (!article) return;
		repaintObserver = new MutationObserver(() => {
			if (mounted) paintStandIns(mounted.standIns);
		});
		repaintObserver.observe(article, {
			childList: true,
			subtree: true
		});
	}
	var STYLE_ID = "bb-styles";
	var CSS = `
.bb-sentence-slot {
  min-width: min(100%, 31.25rem);
  margin-top: 1.5rem;
}
@media (min-width: 640px) {
  .bb-sentence-slot {
    min-width: max(fit-content, 31.25rem);
    margin-top: 2rem;
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
.bb-feature-copy {
  display: grid;
  gap: 0.5rem;
  min-width: 0;
}
.bb-feature-about {
  min-width: 0;
}
.bb-feature-about-summary {
  display: flex;
  align-items: center;
  gap: 0.5em;
  cursor: pointer;
  list-style: none;
  user-select: none;
}
.bb-feature-about-summary::-webkit-details-marker {
  display: none;
}
.bb-feature-caret {
  flex-shrink: 0;
  width: 1.125em;
  height: 1.125em;
  color: rgb(var(--c-primary-accent) / 1);
  transition: transform 120ms ease;
}
.bb-feature-about[open] > .bb-feature-about-summary > .bb-feature-caret {
  transform: rotate(90deg);
}
.bb-feature-desc {
  margin-top: 0.5rem;
}
/**
 * The element is named in the selector to outweigh the \`text-primary-fg\` Bunpro
 * leaves on the field: Bunpro's stylesheets are linked after this one, so an
 * equally specific rule of ours would lose.
 */
input.bb-wrong-guess {
  color: rgb(var(--c-incorrect) / 1);
}
.bb-shaking {
  animation: bb-shake 320ms ease;
}
@keyframes bb-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-0.375rem); }
  40% { transform: translateX(0.375rem); }
  60% { transform: translateX(-0.25rem); }
  80% { transform: translateX(0.125rem); }
}
`;
	function injectStyles() {
		if (document.getElementById(STYLE_ID)) return;
		const style = document.createElement("style");
		style.id = STYLE_ID;
		style.textContent = CSS;
		document.head.append(style);
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
	function termToPrefetch(state) {
		if (state.reviewable?.type !== "vocab" || state.questionMode !== "translate") return null;
		return state.sessionId ? state.reviewable : null;
	}
	function termToShow(state, hasNativeSentence) {
		const term = termToPrefetch(state);
		if (!term || !state.isRevealing || !state.isCorrect || hasNativeSentence) return null;
		return term;
	}
	var stopWatchingQuiz$2 = null;
	var exampleSentenceFeature = {
		id: "example-sentence",
		title: "Show unverified example sentences for A1+ vocab",
		description: "On the web, Bunpro does not show unverified example sentences for A1+ vocab, even if you enable \"Display Sentence alongside Translation Questions\" in review settings. That is despite such a feature being present in the mobile app. If enabled, this feature will show these unverified sentences after submitting a correct answer, and it will cycle through which sentence is displayed for each review session.",
		enabledByDefault: true,
		start() {
			injectStyles();
			stopWatchingQuiz$2 = watchQuizState(onQuizStateChange$2);
		},
		stop() {
			stopWatchingQuiz$2?.();
			stopWatchingQuiz$2 = null;
			clearSentence();
		}
	};
	function onQuizStateChange$2(state) {
		dropSentenceUnless(solvedReviewKey(state));
		const upcoming = termToPrefetch(state);
		if (upcoming) loadSentences(upcoming);
		const term = termToShow(state, hasNativeSentenceCard());
		const reviewKey = solvedReviewKey(state);
		if (!term || !reviewKey || !state.sessionId || shownSentence()?.reviewKey === reviewKey) return;
		showRotatedSentence(term, reviewKey, state.sessionId);
	}
	async function showRotatedSentence(term, reviewKey, sessionId) {
		const sentences = await loadSentences(term);
		if (sentences.length === 0) return;
		if (solvedReviewKey(readQuizState()) !== reviewKey || shownSentence()?.reviewKey === reviewKey) return;
		showSentence({
			reviewKey,
			sentences,
			index: pickSentenceIndex(termKey(term), sessionId, sentences.length)
		});
	}
	var TIMEOUT_MS = 8e3;
	function requestText(request) {
		return send(request, "text");
	}
	function requestBlob(request) {
		return send(request, "blob");
	}
	function send({ url, method = "GET", headers, body }, responseType) {
		return new Promise((resolve, reject) => {
			_GM_xmlhttpRequest({
				url,
				method,
				headers,
				data: body,
				responseType,
				anonymous: true,
				timeout: TIMEOUT_MS,
				onload: (response) => {
					if (response.status < 200 || response.status >= 300) {
						reject(new Error(`${url} responded ${response.status}`));
						return;
					}
					resolve(response.response);
				},
				onerror: () => reject(new Error(`${url} could not be reached`)),
				ontimeout: () => reject(new Error(`${url} took longer than ${TIMEOUT_MS}ms`))
			});
		});
	}
	function parsePage(html) {
		return new DOMParser().parseFromString(html, "text/html");
	}
	function isSameWord({ term, reading }, entryReading) {
		const kana = entryReading?.trim() ?? "";
		if (kana === "") return false;
		return reading === term || reading === kana;
	}
	function clipId({ term, reading }) {
		return `audio_${term}:${reading}`;
	}
	var ENDPOINT$1 = "https://www.japanesepod101.com/learningcenter/reference/dictionary_post";
	var japanesePod101Dictionary = {
		name: "JapanesePod101 dictionary",
		async find(word) {
			return recordingsIn$1(parsePage(await requestText(searchFor(word))), word);
		}
	};
	function searchFor({ term }) {
		return {
			url: ENDPOINT$1,
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				post: "dictionary_reference",
				match_type: "exact",
				search_query: term,
				vulgar: "true"
			}).toString()
		};
	}
	function recordingsIn$1(page, word) {
		const urls = new Set();
		for (const row of page.querySelectorAll(".dc-result-row")) {
			const url = row.querySelector("audio source")?.getAttribute("src");
			if (url && isSameWord(word, row.querySelector(".dc-vocab_kana")?.textContent)) urls.add(new URL(url, ENDPOINT$1).href);
		}
		return [...urls];
	}
	var SEARCH = "https://jisho.org/search/";
	var jisho = {
		name: "Jisho",
		async find(word) {
			return recordingsIn(parsePage(await requestText({ url: SEARCH + encodeURIComponent(word.term) })), word);
		}
	};
	function recordingsIn(page, word) {
		const url = page.getElementById(clipId(word))?.querySelector("source")?.getAttribute("src");
		return url ? [new URL(url, SEARCH).href] : [];
	}
	var ENDPOINT = "https://assets.languagepod101.com/dictionary/japanese/audiomp3.php";
	var jpod101 = {
		name: "JapanesePod101",
		placeholderDigest: "ae6398b5a27bc8c0a771df6c907ade794be15518174773c58c7c7ddd17098906",
		async find(word) {
			return [jpod101Url(word)];
		}
	};
	function jpod101Url({ term, reading }) {
		const query = new URLSearchParams();
		if (term !== "" && !(term === reading && isEntirelyKana(term))) query.set("kanji", term);
		if (reading !== "") query.set("kana", reading);
		return `${ENDPOINT}?${query}`;
	}
	var AUDIO_SOURCES = [
		jpod101,
		japanesePod101Dictionary,
		jisho
	];
	async function findRecording(word) {
		for (const source of AUDIO_SOURCES) {
			const recording = await recordingFrom(source, word);
			if (recording) return recording;
		}
		return null;
	}
	async function recordingFrom(source, word) {
		try {
			for (const url of await source.find(word)) {
				const clip = await requestBlob({ url });
				if (!await isPlaceholder(clip, source)) return URL.createObjectURL(clip);
			}
		} catch (error) {
			warnOnce(`audio-source:${source.name}`, `Could not reach ${source.name} for audio:`, error);
		}
		return null;
	}
	async function isPlaceholder(clip, source) {
		return source.placeholderDigest !== void 0 && await sha256(clip) === source.placeholderDigest;
	}
	async function sha256(clip) {
		const digest = await crypto.subtle.digest("SHA-256", await clip.arrayBuffer());
		return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
	}
	var recordings = new Map();
	function remember(ttsUrls, recording) {
		for (const url of ttsUrls) recordings.set(canonicalAudioUrl(url), recording);
	}
	function replacementFor(ttsUrl) {
		return recordings.get(canonicalAudioUrl(ttsUrl)) ?? null;
	}
	function urlToPlay(requested) {
		return replacementFor(requested) ?? requested;
	}
	function forget(ttsUrls) {
		for (const url of ttsUrls) recordings.delete(canonicalAudioUrl(url));
	}
	function forgetAll() {
		recordings.clear();
	}
	function canonicalAudioUrl(url) {
		try {
			return decodeURI(url);
		} catch {
			return url;
		}
	}
	var lookups = new Map();
	var REMEMBERED = 50;
	async function findReplacement(audio) {
		const word = `${audio.term}|${audio.reading}`;
		let lookup = lookups.get(word);
		if (!lookup) {
			lookup = {
				ttsUrls: audio.ttsUrls,
				recording: findRecording(audio)
			};
			lookups.set(word, lookup);
			forgetOldest();
		}
		const recording = await lookup.recording;
		if (recording !== null && lookups.get(word) === lookup) remember(lookup.ttsUrls, recording);
	}
	function forgetReplacements() {
		for (const lookup of lookups.values()) lookup.recording.then(revoke);
		lookups.clear();
		forgetAll();
	}
	function forgetOldest() {
		for (const [word, lookup] of lookups) {
			if (lookups.size <= REMEMBERED) return;
			lookups.delete(word);
			forget(lookup.ttsUrls);
			lookup.recording.then(revoke);
		}
	}
	function revoke(recording) {
		if (recording !== null) URL.revokeObjectURL(recording);
	}
	function synthesisedTermAudio(item) {
		if (!item.has_tts_audio || !item.title) return null;
		const ttsUrls = [item.male_audio_url, item.female_audio_url].filter((url) => url !== null && url !== "");
		if (ttsUrls.length === 0) return null;
		return {
			term: item.title,
			reading: item.kana || item.title,
			ttsUrls: ttsUrls.map(canonicalAudioUrl)
		};
	}
	async function loadTermAudio(term) {
		try {
			const item = await fetchReviewable(term);
			const audio = item ? synthesisedTermAudio(item) : null;
			if (audio) await findReplacement(audio);
		} catch (error) {
			warnOnce("term-audio", "Could not replace synthesised term audio:", error);
		}
	}
	var nativeSrc = null;
	var nativePlay = null;
	function startReplacingAudio() {
		if (nativeSrc) return;
		const src = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");
		if (!src?.get || !src.set) throw new Error("HTMLMediaElement.src is not configurable; term audio cannot be replaced");
		nativeSrc = {
			get: src.get,
			set: src.set
		};
		nativePlay = HTMLMediaElement.prototype.play;
		Object.defineProperty(HTMLMediaElement.prototype, "src", {
			configurable: true,
			enumerable: true,
			get() {
				return nativeSrc?.get.call(this) ?? "";
			},
			set(url) {
				nativeSrc?.set.call(this, urlToPlay(url));
			}
		});
		HTMLMediaElement.prototype.play = function playReplaced() {
			const replacement = replacementFor(this.src);
			if (replacement !== null && this.src !== replacement) this.src = replacement;
			return nativePlay?.call(this) ?? Promise.resolve();
		};
	}
	function stopReplacingAudio() {
		if (!nativeSrc || !nativePlay) return;
		Object.defineProperty(HTMLMediaElement.prototype, "src", {
			configurable: true,
			enumerable: true,
			get: nativeSrc.get,
			set: nativeSrc.set
		});
		HTMLMediaElement.prototype.play = nativePlay;
		nativeSrc = null;
		nativePlay = null;
	}
	var stopWatchingQuiz$1 = null;
	var humanTermAudioFeature = {
		id: "human-term-audio",
		title: "Play real speakers instead of synthesised term audio",
		description: "When Bunpro would play synthesised audio for a vocabulary term, play a recording of a person saying it instead, looked up the same way Yomitan does (JapanesePod101, then Jisho). Sentence audio is left alone, and a term Bunpro already recorded is left alone. If nobody has recorded the word, the synthesised clip still plays.",
		enabledByDefault: true,
		start() {
			startReplacingAudio();
			stopWatchingQuiz$1 = watchQuizState(onQuizStateChange$1);
		},
		stop() {
			stopWatchingQuiz$1?.();
			stopWatchingQuiz$1 = null;
			stopReplacingAudio();
			forgetReplacements();
		}
	};
	function onQuizStateChange$1(state) {
		if (state.reviewable?.type === "vocab") loadTermAudio(state.reviewable);
	}
	var version = "0.4.0";
	var PANEL_ID = "bb-settings-panel";
	var CARD_CLASS = "bb-panel-card relative z-1 flex flex-col overflow-hidden rounded-normal border border-rim bg-secondary-bg text-primary-fg shadow-normal";
	var CLOSE_SHAPES = "<path d=\"M6 6 18 18M18 6 6 18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>";
	var CARET_SHAPES = "<path d=\"M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.41 1.41l4.59-4.59a1 1 0 0 0 0-1.41L10.7 6.7a1 1 0 0 0-1.41.01\" fill=\"currentColor\"/>";
	function isSettingsPanelOpen() {
		return document.getElementById(PANEL_ID) !== null;
	}
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
		return element("header", { class: "flex items-center justify-between gap-16 border-b border-rim p-16" }, [element("div", { class: "flex items-baseline gap-8" }, [element("h2", { class: "text-large font-bold" }, ["Better Bunpro"]), element("span", { class: "text-small text-tertiary-fg" }, [`v${scriptVersion()}`])]), close]);
	}
	function scriptVersion() {
		return version;
	}
	function buildFeatureList() {
		return element("ul", { class: "grid gap-16" }, listFeatures().map(buildFeatureRow));
	}
	function buildFeatureRow(feature) {
		const description = element("p", { class: "bb-feature-desc text-small text-tertiary-fg" }, [feature.description]);
		const caret = svgIcon("bb-feature-caret", CARET_SHAPES);
		return element("li", { class: "flex items-start justify-between gap-16" }, [element("details", { class: "bb-feature-about grow" }, [element("summary", { class: "bb-feature-about-summary font-bold" }, [element("span", {}, [feature.title]), caret]), ...feature.credit ? [description, buildCredit(feature.credit)] : [description]]), buildSwitch(feature)]);
	}
	function buildCredit(credit) {
		return element("p", { class: "bb-feature-desc text-small text-tertiary-fg" }, [
			"Idea from ",
			buildLink(credit.author, credit.authorUrl),
			"’s ",
			buildLink(credit.work, credit.workUrl),
			"."
		]);
	}
	function buildLink(text, href) {
		return element("a", {
			href,
			target: "_blank",
			rel: "noreferrer noopener",
			class: "text-primary-accent"
		}, [text]);
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
	var WRONG_CLASS = "bb-wrong-guess";
	var SHAKE_CLASS = "bb-shaking";
	var BUNPRO_INCORRECT_CLASS = "bp-quiz-console--incorrect";
	var WATCHED_ATTRIBUTE = "bbWatched";
	function markGuessWrong() {
		const input = findAnswerInput();
		const answerConsole = findAnswerConsole();
		if (!input || !answerConsole) return;
		watchField(input);
		input.classList.add(WRONG_CLASS);
		answerConsole.classList.add(BUNPRO_INCORRECT_CLASS);
		shake(input);
	}
	function clearMark() {
		findAnswerInput()?.classList.remove(WRONG_CLASS);
		findAnswerConsole()?.classList.remove(BUNPRO_INCORRECT_CLASS);
	}
	function shake(input) {
		input.classList.remove(SHAKE_CLASS);
		input.offsetWidth;
		input.classList.add(SHAKE_CLASS);
	}
	function watchField(input) {
		if (input.dataset[WATCHED_ATTRIBUTE]) return;
		input.dataset[WATCHED_ATTRIBUTE] = "true";
		input.addEventListener("input", clearMark);
		input.addEventListener("animationend", () => input.classList.remove(SHAKE_CLASS));
	}
	var TRANSLATION_SIMILARITY = .8;
	var LATIN_LETTER = /[a-z]/i;
	function gradeAnswer(questionMode, answers, typed) {
		const guess = typed.trim();
		if (guess === "" || answers.length === 0) return "unknown";
		if (questionMode === "translate") return gradedBySimilarity(answers, guess);
		if (questionMode === "reading") return gradedExactly(answers, guess);
		return "unknown";
	}
	function gradedBySimilarity(answers, guess) {
		return Math.max(...answers.map((answer) => similarity(normalize(answer), normalize(guess)))) >= TRANSLATION_SIMILARITY ? "accepted" : "rejected";
	}
	function gradedExactly(answers, guess) {
		if (LATIN_LETTER.test(guess)) return "unknown";
		return answers.some((answer) => normalize(answer) === normalize(guess)) ? "accepted" : "rejected";
	}
	function similarity(left, right) {
		if (left.length === 0) return right.length === 0 ? 1 : 0;
		if (right.length === 0) return 0;
		return 1 - distance(left, right) / Math.max(left.length, right.length);
	}
	function distance(left, right) {
		const target = [...right];
		let row = target.map((_, column) => column + 1);
		[...left].forEach((source, sourceIndex) => {
			let diagonal = sourceIndex;
			let previous = sourceIndex + 1;
			row = row.map((above, column) => {
				const cell = Math.min(diagonal + (source === target[column] ? 0 : 1), above + 1, previous + 1);
				diagonal = above;
				previous = cell;
				return cell;
			});
		});
		return row[target.length - 1] ?? left.length;
	}
	var LIGATURES = {
		æ: "ae",
		œ: "oe",
		ß: "ss"
	};
	function normalize(text) {
		return [...text.toLowerCase()].map(foldLetter).join("").trim();
	}
	function foldLetter(letter) {
		if (isJapanese(letter)) return letter;
		return (LIGATURES[letter] ?? letter).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
	}
	var SUBMIT_KEY = "Enter";
	var lastRejected = null;
	var keepGuessingFeature = {
		id: "keep-guessing",
		title: "Keep guessing after a wrong answer",
		description: "On a review you type an English translation or a reading into, Bunpro reveals the answer the moment you get it wrong. With this on, a wrong answer is not submitted at all: your text stays in the box so you can try again. To give up and see the answer, either clear the box and press Enter, or press Enter again on the same wrong answer. Because a guess this catches never reaches Bunpro, the review is graded on the answer you finally submit.",
		enabledByDefault: true,
		start() {
			injectStyles();
			window.addEventListener("keydown", onKeyDown$1, true);
			window.addEventListener("click", onClick, true);
		},
		stop() {
			window.removeEventListener("keydown", onKeyDown$1, true);
			window.removeEventListener("click", onClick, true);
			lastRejected = null;
		}
	};
	function onKeyDown$1(event) {
		if (event.key !== SUBMIT_KEY || event.repeat || hasModifier$1(event) || isSettingsPanelOpen()) return;
		swallowIfWrong(event);
	}
	function onClick(event) {
		const target = event.target;
		if (!(target instanceof Node) || findSubmitButton()?.contains(target) !== true) return;
		swallowIfWrong(event);
	}
	function swallowIfWrong(event) {
		if (!isWrongGuess()) return;
		event.preventDefault();
		event.stopPropagation();
		markGuessWrong();
	}
	function isWrongGuess() {
		const input = findAnswerInput();
		const state = readQuizState();
		if (!input || !isAwaitingTypedAnswer(state)) return false;
		const review = reviewKey(state);
		if (!review) return false;
		const guess = input.value.trim();
		if (lastRejected?.reviewKey === review && lastRejected.guess === guess) {
			lastRejected = null;
			return false;
		}
		if (gradeAnswer(state.questionMode, state.answers, guess) !== "rejected") return false;
		lastRejected = {
			reviewKey: review,
			guess
		};
		return true;
	}
	function isAwaitingTypedAnswer(state) {
		return state.inputMode === "manual" && !state.isPostAttempt && !state.isRevealing;
	}
	function hasModifier$1(event) {
		return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
	}
	function bunproSentenceIndex(sentences) {
		const shownId = nativeSentenceId();
		if (shownId !== null) {
			const found = sentences.findIndex((sentence) => sentence.id === shownId);
			if (found !== -1) return found;
		}
		const rendered = findClozeSentence()?.textContent;
		if (rendered) {
			const found = indexOfRenderedSentence(rendered, sentences.map(partsTextOf));
			if (found !== -1) return found;
		}
		return 0;
	}
	function indexOfRenderedSentence(rendered, candidates) {
		const shown = withoutSpaces(rendered);
		return candidates.findIndex((parts) => {
			const pieces = parts.map(withoutSpaces).filter((piece) => piece !== "");
			return pieces.length > 0 && appearInOrder(shown, pieces);
		});
	}
	function appearInOrder(shown, pieces) {
		let searchFrom = 0;
		for (const piece of pieces) {
			const at = shown.indexOf(piece, searchFrom);
			if (at === -1) return false;
			searchFrom = at + piece.length;
		}
		return true;
	}
	function withoutSpaces(text) {
		return text.replace(/\s+/g, "");
	}
	function partsTextOf(sentence) {
		const holder = document.createElement("div");
		return questionSentenceParts(sentence).map((part) => {
			holder.innerHTML = part;
			return holder.textContent ?? "";
		});
	}
	function nextSentenceIndex(shownIndex, count) {
		return count === 0 ? 0 : (shownIndex + 1) % count;
	}
	var CYCLE_KEY = "Tab";
	var stopWatchingQuiz = null;
	var sentenceCycleFeature = {
		id: "sentence-cycle",
		title: "Cycle example sentences with Tab",
		description: "Once you have answered a review correctly, press Tab to see the same item in another one of its example sentences, and again to keep cycling through them. On a cloze review the question sentence itself is swapped; elsewhere the sentence card is. Your answer still belongs to the sentence you were actually quizzed on, and the sentence your next review session starts on is unchanged.",
		credit: {
			author: "Joseph G",
			authorUrl: "https://greasyfork.org/en/users/1613422-joseph-g",
			work: "Bunpro Sentence Cycle",
			workUrl: "https://greasyfork.org/en/scripts/584571-bunpro-sentence-cycle"
		},
		enabledByDefault: true,
		start() {
			injectStyles();
			stopWatchingQuiz = watchQuizState(onQuizStateChange);
			window.addEventListener("keydown", onKeyDown, true);
		},
		stop() {
			window.removeEventListener("keydown", onKeyDown, true);
			stopWatchingQuiz?.();
			stopWatchingQuiz = null;
			clearSentence();
		}
	};
	function onQuizStateChange(state) {
		dropSentenceUnless(solvedReviewKey(state));
		if (state.reviewable && state.sessionId) loadSentences(state.reviewable);
	}
	function onKeyDown(event) {
		if (event.key !== CYCLE_KEY || hasModifier(event) || isSettingsPanelOpen()) return;
		const state = readQuizState();
		const reviewKey = solvedReviewKey(state);
		if (!reviewKey || !state.reviewable || !hasSentenceToCycle(reviewKey)) return;
		event.preventDefault();
		event.stopPropagation();
		cycleSentence(reviewKey, state.reviewable);
	}
	function hasModifier(event) {
		return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
	}
	function hasSentenceToCycle(reviewKey) {
		return shownSentence()?.reviewKey === reviewKey || findNativeSentenceCard() !== null || findClozeSentence() !== null;
	}
	async function cycleSentence(reviewKey, term) {
		const sentences = await loadSentences(term);
		if (sentences.length < 2 || solvedReviewKey(readQuizState()) !== reviewKey) return;
		const shown = shownSentence();
		showSentence({
			reviewKey,
			sentences,
			index: nextSentenceIndex(shown?.reviewKey === reviewKey ? shown.index : bunproSentenceIndex(sentences), sentences.length)
		});
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
	registerFeature(sentenceCycleFeature);
	registerFeature(keepGuessingFeature);
	registerFeature(humanTermAudioFeature);
	mountSettingsLaunchers();
	startEnabledFeatures();
})();
