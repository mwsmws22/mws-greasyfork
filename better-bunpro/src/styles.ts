/**
 * Everything visual is expressed with Bunpro's own utility classes so the UI
 * follows their theme; these are only the few rules we cannot borrow.
 * The 640px breakpoint is Bunpro's `sm:`.
 */
const STYLE_ID = 'bb-styles';

const CSS = `
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

export function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.append(style);
}
