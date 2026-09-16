// ==UserScript==
// @name         Better Bunpro
// @namespace    mwsmws22
// @version      0.5.0
// @author       mwsmws22
// @description  Features I wish Bunpro had. Show example sentences for A1+ vocab after a correct answer, cycle sentences with Tab, keep guessing after a wrong answer, add a missed translation as a synonym, play real speakers instead of synthesised term audio, and more.
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
	function fillAnswerInput(value) {
		const input = findAnswerInput();
		if (!input || input.value === value) return;
		writeAnswerInput(input, value);
		input.dispatchEvent(new Event("input", { bubbles: true }));
	}
	function showAnswerInput(value) {
		const input = findAnswerInput();
		if (!input) return;
		input.placeholder = value;
		if (input.value !== value) writeAnswerInput(input, value);
	}
	function writeAnswerInput(input, value) {
		(Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set)?.call(input, value);
	}
	function findSubmitButton() {
		return document.querySelector(".InputManual__button");
	}
	function findUndoButton() {
		return document.querySelector("svg[data-name=\"UNDO\"]")?.closest("button") ?? null;
	}
	var UNDO_WARNING_ID = "quiz-undo";
	var SKIP_UNDO_MODAL_CLASS = "bb-skipping-undo-modal";
	var UNDO_PROMPT_WAIT_MS = 400;
	var UNDO_TOAST_MS = 2200;
	var restoreUndoFeedbackTimer = null;
	function findUndoConfirmButton() {
		const dialog = document.getElementById(UNDO_WARNING_ID)?.closest("article[role=\"dialog\"]");
		if (!dialog) return null;
		const actions = dialog.querySelectorAll("button.w-full");
		return actions.length > 0 ? actions[actions.length - 1] ?? null : null;
	}
	function undoGradedAnswer() {
		const undo = findUndoButton();
		if (!undo) return;
		hideUndoFeedback();
		undo.click();
		const confirm = findUndoConfirmButton();
		if (confirm) {
			confirm.click();
			return;
		}
		waitForUndoConfirm();
	}
	function hideUndoFeedback() {
		document.documentElement.classList.add(SKIP_UNDO_MODAL_CLASS);
		if (restoreUndoFeedbackTimer !== null) window.clearTimeout(restoreUndoFeedbackTimer);
		restoreUndoFeedbackTimer = window.setTimeout(showUndoFeedback, UNDO_TOAST_MS);
	}
	function waitForUndoConfirm() {
		const observer = new MutationObserver(() => {
			const confirm = findUndoConfirmButton();
			if (!confirm) return;
			window.clearTimeout(timeout);
			observer.disconnect();
			confirm.click();
		});
		const timeout = window.setTimeout(() => {
			observer.disconnect();
		}, UNDO_PROMPT_WAIT_MS);
		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	}
	function showUndoFeedback() {
		restoreUndoFeedbackTimer = null;
		document.documentElement.classList.remove(SKIP_UNDO_MODAL_CLASS);
	}
	function findAnswerConsole() {
		return document.querySelector(".InputManual");
	}
	function findQuizConsole() {
		return document.querySelector(`${QUIZ_ARTICLE} .bp-quiz-console`);
	}
	function findHotkeyGuideArticle() {
		return document.querySelector("#modal-portal article.grid.gap-24.text-secondary-fg");
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
		submittedAnswer: null,
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
			submittedAnswer: parseSubmitted(element.getAttribute("data-meta-input")),
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
	function parseSubmitted(raw) {
		if (!raw || raw === "null") return null;
		return raw;
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
	var API_BASE = "https://api.bunpro.jp/api/frontend";
	var TOKEN_COOKIE = "frontend_api_token";
	var LOCALE_COOKIE = "locale";
	var JSON_HEADERS = {
		Accept: "application/json",
		"Content-Type": "application/json"
	};
	async function bunproRequest(path, init = {}) {
		const token = readCookie(TOKEN_COOKIE);
		if (!token) throw new Error(`No ${TOKEN_COOKIE} cookie found; are you signed in to Bunpro?`);
		const response = await fetch(`${API_BASE}${path}`, {
			...init,
			credentials: "omit",
			headers: {
				Accept: "application/json",
				Authorization: `Token token=${token}`,
				...init.headers
			}
		});
		const payload = isJson(response) ? await response.json() : null;
		if (!response.ok) throw new Error(`${path} responded ${response.status}: ${describeErrors(payload, response)}`);
		return payload;
	}
	function jsonBody(method, body) {
		return {
			method,
			headers: JSON_HEADERS,
			body: JSON.stringify(body)
		};
	}
	function bunproLocale() {
		return readCookie(LOCALE_COOKIE) ?? "en";
	}
	function attributesOf(document) {
		const record = Array.isArray(document?.data) ? document.data[0] : document?.data;
		return record?.attributes ? withRecordId(record) : null;
	}
	function includedOfType(document, type) {
		return recordsOfType(document?.included, type);
	}
	function dataOfType(document, type) {
		const data = document?.data;
		return recordsOfType(Array.isArray(data) ? data : data ? [data] : [], type);
	}
	function recordsOfType(records, type) {
		const matching = [];
		for (const record of records ?? []) if (record.type === type && record.attributes) matching.push(withRecordId(record));
		return matching;
	}
	function withRecordId(record) {
		const attributes = record.attributes ?? {};
		if (typeof attributes.id === "number") return attributes;
		return {
			...attributes,
			id: Number(record.id)
		};
	}
	function describeErrors(payload, response) {
		const described = (payload?.errors ?? []).map((error) => error.detail ?? error.code ?? "").filter((text) => text !== "").join(", ");
		return described === "" ? response.statusText : described;
	}
	function isJson(response) {
		return response.headers.get("Content-Type")?.includes("application/json") === true;
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
	var PASCAL_TYPE = {
		vocab: "Vocab",
		grammar_point: "GrammarPoint"
	};
	async function reviewOf(term) {
		const reviews = dataOfType(await bunproRequest("/reviews/hydrate_reviewables", jsonBody("POST", { reviewables: [reviewableTuple(term)] })), "review");
		return reviews.find((review) => review.reviewable_id === term.id) ?? reviews[0] ?? null;
	}
	function reviewableTuple(term) {
		return [PASCAL_TYPE[term.type], term.id];
	}
	async function addUserSynonym(vocabId, synonym) {
		const existing = parseSynonyms((await reviewOf({
			id: vocabId,
			type: "vocab"
		}))?.user_synonyms);
		if (includesSynonym(existing, synonym)) return "already-there";
		await saveUserSynonyms(vocabId, [...existing, synonym.trim()]);
		return "added";
	}
	async function saveUserSynonyms(vocabId, synonyms) {
		await bunproRequest(`/reviews/vocab/${vocabId}/manage_user_synonyms`, jsonBody("POST", { user_synonyms: serializeSynonyms(synonyms) }));
	}
	function parseSynonyms(stored) {
		if (typeof stored !== "string") return [];
		return stored.split(",").map((synonym) => synonym.trim()).filter((synonym) => synonym !== "");
	}
	function serializeSynonyms(synonyms) {
		const kept = new Set();
		for (const synonym of synonyms) {
			const trimmed = synonym.trim();
			if (trimmed !== "" && trimmed.length <= 38) kept.add(trimmed);
		}
		return [...kept].join(",");
	}
	function includesSynonym(synonyms, candidate) {
		const wanted = normalize(candidate);
		return synonyms.some((synonym) => normalize(synonym) === wanted);
	}
	function synonymWorthAdding(submitted, accepted) {
		const trimmed = submitted.trim();
		if (trimmed === "" || trimmed.length > 38) return false;
		return !includesSynonym(accepted, trimmed);
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
.bb-add-synonym {
  width: min(100%, 36rem);
  margin: 0 auto;
  padding: 0 0.375rem 0.5rem;
}
html.bb-skipping-undo-modal .Modal,
html.bb-skipping-undo-modal #tooltip-portal,
html.bb-skipping-undo-modal .Toast {
  visibility: hidden !important;
  opacity: 0 !important;
}
.bb-popover {
  width: max-content;
  max-width: min(20rem, calc(100vw - 1rem));
}
.bb-popover-term {
  line-height: 1.6;
}
/** A word in a sentence that can be looked up, hinted at only on hover. */
.bb-lookup-target {
  cursor: pointer;
}
/**
 * The element is named in the selector to outweigh the \`text-primary-fg\` Bunpro
 * leaves on the field: Bunpro's stylesheets are linked after this one, so an
 * equally specific rule of ours would lose.
 */
input.bb-wrong-guess {
  color: rgb(var(--c-incorrect) / 1);
}
input.bb-correct-guess {
  color: rgb(var(--c-correct) / 1);
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
	var BASE_CLASS = "flex w-full items-center justify-center gap-4 rounded-normal border px-12 py-6 text-extra-small md:text-body font-normal transition-colors";
	var STATE_CLASS = {
		idle: "border-rim bg-secondary-bg text-primary-fg",
		working: "border-rim bg-secondary-bg text-tertiary-fg",
		done: "border-rim bg-secondary-bg text-correct",
		failed: "border-rim bg-secondary-bg text-error"
	};
	function buildActionButton(options) {
		const label = element("span", { class: "text-left" });
		const button = element("button", { type: "button" }, options.icon ? [svgIcon("h-24 w-24 shrink-0", options.icon), label] : [label]);
		let state = options.startAs === "done" ? "done" : "idle";
		let message = null;
		const paint = () => {
			button.className = `${BASE_CLASS} ${STATE_CLASS[state]}`;
			label.textContent = message ?? options.labels[state];
			button.disabled = state === "working" || state === "done";
		};
		button.addEventListener("click", () => {
			if (state === "working" || state === "done") return;
			state = "working";
			message = null;
			paint();
			options.run().then((outcome) => {
				state = "done";
				message = typeof outcome === "string" ? outcome : null;
				paint();
			}, (error) => {
				console.warn("[Better Bunpro]", options.labels.failed, error);
				state = "failed";
				message = null;
				paint();
			});
		});
		paint();
		return button;
	}
	var claims = [];
	function claimKeystrokes(node, onEscape) {
		const claim = {
			node,
			onEscape
		};
		claims.push(claim);
		if (claims.length === 1) window.addEventListener("keydown", onKeyDown$3, true);
		return () => {
			const index = claims.indexOf(claim);
			if (index !== -1) claims.splice(index, 1);
			if (claims.length === 0) window.removeEventListener("keydown", onKeyDown$3, true);
		};
	}
	function areKeystrokesClaimed() {
		return claims.length > 0;
	}
	function hasModifier(event) {
		return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
	}
	function onKeyDown$3(event) {
		const newest = claims[claims.length - 1];
		if (!newest) return;
		if (event.key === "Escape") {
			event.preventDefault();
			event.stopPropagation();
			newest.onEscape();
			return;
		}
		const target = event.target;
		if (target instanceof Node && claims.some((claim) => claim.node.contains(target))) event.stopPropagation();
	}
	var accepted = null;
	function rememberAcceptedGuess(reviewKey, guess, official) {
		accepted = {
			reviewKey,
			guess,
			official
		};
	}
	function takeAcceptedOfficial(reviewKey, guess) {
		if (accepted === null || accepted.reviewKey !== reviewKey || !isRememberedGuess(accepted.guess, guess)) return null;
		return takeOfficial();
	}
	function takeAcceptedOfficialForReview(reviewKey) {
		if (accepted === null || accepted.reviewKey !== reviewKey) return null;
		return takeOfficial();
	}
	function takeOfficial() {
		const official = accepted?.official ?? "";
		accepted = null;
		return official;
	}
	function isRememberedGuess(original, guess) {
		return guess === original || guess === original.slice(0, -1);
	}
	var WRONG_CLASS = "bb-wrong-guess";
	var CORRECT_CLASS = "bb-correct-guess";
	var SHAKE_CLASS = "bb-shaking";
	var BUNPRO_INCORRECT_CLASS = "bp-quiz-console--incorrect";
	var BUNPRO_CORRECT_CLASS = "bp-quiz-console--correct";
	var WATCHED_ATTRIBUTE = "bbWatched";
	function markGuessWrong() {
		const input = findAnswerInput();
		const answerConsole = findAnswerConsole();
		if (!input || !answerConsole) return;
		watchField(input);
		input.classList.remove(CORRECT_CLASS);
		input.classList.add(WRONG_CLASS);
		answerConsole.classList.remove(BUNPRO_CORRECT_CLASS);
		answerConsole.classList.add(BUNPRO_INCORRECT_CLASS);
		shake(input);
	}
	function markGuessCorrect() {
		const input = findAnswerInput();
		const answerConsole = findAnswerConsole();
		if (!input || !answerConsole) return;
		watchField(input);
		input.classList.remove(WRONG_CLASS);
		input.classList.add(CORRECT_CLASS);
		answerConsole.classList.remove(BUNPRO_INCORRECT_CLASS);
		answerConsole.classList.add(BUNPRO_CORRECT_CLASS);
	}
	function clearMark() {
		findAnswerInput()?.classList.remove(WRONG_CLASS, CORRECT_CLASS);
		findAnswerConsole()?.classList.remove(BUNPRO_INCORRECT_CLASS, BUNPRO_CORRECT_CLASS);
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
	var SUBMIT_KEY = "Enter";
	var lastRejected = null;
	var officialSubmitTimer = null;
	var keepGuessingFeature = {
		id: "keep-guessing",
		title: "Keep guessing after a wrong answer",
		description: "On a review you type an English translation or a reading into, Bunpro reveals the answer the moment you get it wrong. With this on, a wrong answer is not submitted at all: your text stays in the box so you can try again. To give up and see the answer, either clear the box and press Enter, or press Enter again on the same wrong answer. Because a guess this catches never reaches Bunpro, the review is graded on the answer you finally submit.",
		enabledByDefault: true,
		start() {
			injectStyles();
			window.addEventListener("keydown", onKeyDown$2, true);
			window.addEventListener("click", onClick, true);
		},
		stop() {
			window.removeEventListener("keydown", onKeyDown$2, true);
			window.removeEventListener("click", onClick, true);
			lastRejected = null;
			if (officialSubmitTimer !== null) {
				window.clearTimeout(officialSubmitTimer);
				officialSubmitTimer = null;
			}
		}
	};
	function onKeyDown$2(event) {
		if (event.key !== SUBMIT_KEY || event.repeat || hasModifier(event) || areKeystrokesClaimed()) return;
		swallowIfWrong(event);
	}
	function onClick(event) {
		const target = event.target;
		if (!(target instanceof Node) || findSubmitButton()?.contains(target) !== true) return;
		swallowIfWrong(event);
	}
	function swallowIfWrong(event) {
		if (submitRememberedAsCorrect(event)) return;
		if (!isWrongGuess()) return;
		event.preventDefault();
		event.stopPropagation();
		markGuessWrong();
	}
	function submitRememberedAsCorrect(event) {
		const input = findAnswerInput();
		const state = readQuizState();
		if (!input || !isAwaitingTypedAnswer(state)) return false;
		const review = reviewKey(state);
		if (!review) return false;
		const official = takeAcceptedOfficial(review, input.value.trim());
		if (official === null) return false;
		lastRejected = null;
		event.preventDefault();
		event.stopPropagation();
		queueOfficialSubmit(official);
		return true;
	}
	function submitAcceptedStandIn(reviewKey) {
		const official = takeAcceptedOfficialForReview(reviewKey);
		if (official === null) return false;
		lastRejected = null;
		queueOfficialSubmit(official);
		return true;
	}
	function queueOfficialSubmit(official) {
		fillAnswerInput(official);
		if (officialSubmitTimer !== null) window.clearTimeout(officialSubmitTimer);
		officialSubmitTimer = window.setTimeout(() => {
			officialSubmitTimer = null;
			fillAnswerInput(official);
			findSubmitButton()?.click();
		}, 0);
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
	function shouldOfferSynonym(state) {
		return state.reviewable?.type === "vocab" && state.inputMode === "manual" && state.questionMode === "translate" && state.isPostAttempt && !state.isCorrect && synonymWorthAdding(state.submittedAnswer ?? "", state.answers);
	}
	var SLOT_ID = "bb-add-synonym";
	var SYNONYM_KEY = "s";
	var PLUS_SHAPES = "<path d=\"M12 5v14M5 12h14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>";
	var stopWatchingQuiz$3 = null;
	var remountObserver = null;
	var addedFor = null;
	var addedGuess = null;
	var standInQueuedFor = null;
	var addSynonymFeature = {
		id: "add-synonym",
		title: "Add a wrong answer as a synonym",
		description: "After you miss a vocab translation, Bunpro hides \"Your Synonyms\" down in More Info. With this on, an Add as synonym button sits next to the wrong answer so you can accept what you typed without scrolling. Adding it saves the guess and immediately marks this review correct. Press S for the same action. The guess is saved through the same request Bunpro's own synonym field uses, and a guess it already accepts is not offered again.",
		enabledByDefault: true,
		start() {
			injectStyles();
			stopWatchingQuiz$3 = watchQuizState(syncButton);
			remountObserver = new MutationObserver(() => syncButton(readQuizState()));
			remountObserver.observe(document.body, {
				childList: true,
				subtree: true
			});
			window.addEventListener("keydown", onKeyDown$1, true);
		},
		stop() {
			window.removeEventListener("keydown", onKeyDown$1, true);
			stopWatchingQuiz$3?.();
			stopWatchingQuiz$3 = null;
			remountObserver?.disconnect();
			remountObserver = null;
			removeButton();
			addedFor = null;
			addedGuess = null;
			standInQueuedFor = null;
		}
	};
	function syncButton(state) {
		const review = reviewKey(state);
		if (review !== null && addedFor === review) followThroughAcceptedGuess(state, review);
		if (!shouldOfferSynonym(state) || !findQuizArticle()) {
			removeButton();
			return;
		}
		if (document.getElementById(SLOT_ID)) return;
		const console = findQuizConsole();
		if (!console) return;
		console.before(buildSlot(state));
	}
	function onKeyDown$1(event) {
		if (event.key !== SYNONYM_KEY || event.repeat || hasModifier(event) || areKeystrokesClaimed()) return;
		const button = document.querySelector(`#${SLOT_ID} button`);
		if (!button) return;
		event.preventDefault();
		event.stopPropagation();
		if (!button.disabled) button.click();
	}
	function buildSlot(state) {
		const review = reviewKey(state);
		const vocabId = state.reviewable?.id;
		const synonym = state.submittedAnswer?.trim() ?? "";
		const button = buildActionButton({
			labels: {
				idle: "Add as synonym",
				working: "Adding…",
				done: "Added as synonym",
				failed: "Could not add synonym"
			},
			icon: PLUS_SHAPES,
			startAs: review !== null && addedFor === review ? "done" : "idle",
			run: async () => {
				if (vocabId === void 0) throw new Error("No vocab id on the current review");
				const outcome = await addUserSynonym(vocabId, synonym);
				addedFor = review;
				addedGuess = synonym;
				acceptAsCorrect(state, review, synonym);
				return outcome === "already-there" ? "Already a synonym" : void 0;
			}
		});
		return element("div", {
			id: SLOT_ID,
			class: "bb-add-synonym"
		}, [button]);
	}
	function acceptAsCorrect(state, review, synonym) {
		markGuessCorrect();
		if (review !== null && synonym !== "") rememberAcceptedGuess(review, synonym, state.answers[0]?.trim() || synonym);
		if (state.isPostAttempt && !state.isCorrect) {
			undoGradedAnswer();
			return;
		}
		if (review !== null) queueStandIn(review);
	}
	function followThroughAcceptedGuess(state, review) {
		if (!state.isPostAttempt && !state.isRevealing) {
			queueStandIn(review);
			return;
		}
		showAddedGuess();
	}
	function queueStandIn(review) {
		if (standInQueuedFor === review) return;
		standInQueuedFor = review;
		submitAcceptedStandIn(review);
	}
	function showAddedGuess() {
		if (addedGuess === null) return;
		showAnswerInput(addedGuess);
		markGuessCorrect();
	}
	function removeButton() {
		document.getElementById(SLOT_ID)?.remove();
	}
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
		const attributes = attributesOf(await fetchItem(reviewable));
		return attributes ? attributes : null;
	}
	async function requestItem(reviewable) {
		return bunproRequest(`/reviewables/${reviewable.type}/${reviewable.id}?locale=${bunproLocale()}`);
	}
	function collectStudyQuestions(payload) {
		const sentences = [];
		for (const attributes of includedOfType(payload, "study_question")) {
			if (typeof attributes.content !== "string") continue;
			sentences.push(attributes);
		}
		return sentences.sort(bySentenceOrder);
	}
	function bySentenceOrder(left, right) {
		return (left.sentence_order ?? Number.MAX_SAFE_INTEGER) - (right.sentence_order ?? Number.MAX_SAFE_INTEGER);
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
		title: "Play real speakers instead of TTS audio",
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
		if (event.key !== CYCLE_KEY || hasModifier(event) || areKeystrokesClaimed()) return;
		const state = readQuizState();
		const reviewKey = solvedReviewKey(state);
		if (!reviewKey || !state.reviewable || !hasSentenceToCycle(reviewKey)) return;
		event.preventDefault();
		event.stopPropagation();
		cycleSentence(reviewKey, state.reviewable);
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
	var TUNE_SHAPES = `<g fill="currentColor">
  <rect x="3" y="6" width="18" height="2" rx="1"/>
  <rect x="3" y="16" width="18" height="2" rx="1"/>
  <circle cx="9" cy="7" r="3.25"/>
  <circle cx="15" cy="17" r="3.25"/>
</g>`;
	var version = "0.5.0";
	var PANEL_ID = "bb-settings-panel";
	var CARD_CLASS = "bb-panel-card relative z-1 flex flex-col overflow-hidden rounded-normal border border-rim bg-secondary-bg text-primary-fg shadow-normal";
	var CLOSE_SHAPES = "<path d=\"M6 6 18 18M18 6 6 18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>";
	var CARET_SHAPES = "<path d=\"M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.41 1.41l4.59-4.59a1 1 0 0 0 0-1.41L10.7 6.7a1 1 0 0 0-1.41.01\" fill=\"currentColor\"/>";
	var releaseKeystrokes = null;
	function toggleSettingsPanel() {
		if (document.getElementById(PANEL_ID)) {
			closePanel();
			return;
		}
		injectStyles();
		const panel = buildPanel();
		document.body.append(panel);
		releaseKeystrokes = claimKeystrokes(panel, closePanel);
		panel.querySelector(".bb-panel-card")?.focus();
	}
	function closePanel() {
		releaseKeystrokes?.();
		releaseKeystrokes = null;
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
		return element("div", {
			id: PANEL_ID,
			class: "fixed inset-0 z-modal flex items-center justify-center p-16",
			role: "dialog",
			"aria-modal": "true"
		}, [backdrop, card]);
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
	var LAUNCHER_MARKER = "data-bb-launcher";
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
	var HOTKEY_GUIDE_SECTION_ID = "bb-hotkey-guide";
	function buildBetterBunproGuideSection(rows) {
		return element("section", { id: HOTKEY_GUIDE_SECTION_ID }, [element("h2", { class: "mb-8 flex items-center gap-8 font-bold text-primary-fg" }, [svgIcon("ml-4 h-30 w-30 shrink-0", TUNE_SHAPES), element("span", {}, ["Better Bunpro"])]), element("ul", { class: "grid h-fit w-full gap-8" }, rows.map((row) => buildRow(row)))]);
	}
	function buildRow(row) {
		return element("li", { class: "rounded-normal bg-primary-bg px-12 py-8 text-small sm:py-10" }, [element("div", { class: "flex items-center justify-between" }, [element("div", { class: "flex items-center justify-center gap-6" }, [element("p", {}, [row.desc])]), element("p", { class: "text-right font-bold text-primary-fg" }, [row.key])])]);
	}
	function mountHotkeyGuide() {
		const mount = () => {
			const article = findHotkeyGuideArticle();
			if (!article || document.getElementById("bb-hotkey-guide")) return;
			const rows = visibleRows();
			if (rows.length === 0) return;
			article.append(buildBetterBunproGuideSection(rows));
		};
		new MutationObserver(mount).observe(document.body, {
			childList: true,
			subtree: true
		});
		mount();
	}
	function visibleRows() {
		const rows = [];
		if (isFeatureEnabled(addSynonymFeature)) rows.push({
			key: "S",
			desc: "Add as synonym"
		});
		if (isFeatureEnabled(sentenceCycleFeature)) rows.push({
			key: "Tab",
			desc: "Cycle example sentences"
		});
		return rows;
	}
	registerFeature(exampleSentenceFeature);
	registerFeature(sentenceCycleFeature);
	registerFeature(keepGuessingFeature);
	registerFeature(humanTermAudioFeature);
	registerFeature(addSynonymFeature);
	mountSettingsLaunchers();
	mountHotkeyGuide();
	startEnabledFeatures();
})();
