import { findHotkeyGuideArticle } from '../bunpro/quiz-dom';
import { watchBodyRemounts } from '../dom/remount';
import { addSynonymFeature } from '../features/add-synonym/feature';
import { editOnLeftFeature } from '../features/edit-on-left/feature';
import { sentenceCycleFeature } from '../features/sentence-cycle/feature';
import { isFeatureEnabled } from '../features/registry';
import { buildBetterBunproGuideSection, HOTKEY_GUIDE_SECTION_ID, type HotkeyGuideRow } from './hotkey-guide';

export function mountHotkeyGuide(): void {
  const mount = () => {
    const article = findHotkeyGuideArticle();
    if (!article || document.getElementById(HOTKEY_GUIDE_SECTION_ID)) {
      return;
    }
    const rows = visibleRows();
    if (rows.length === 0) {
      return;
    }
    article.append(buildBetterBunproGuideSection(rows));
  };

  watchBodyRemounts(mount);
  mount();
}

function visibleRows(): HotkeyGuideRow[] {
  const rows: HotkeyGuideRow[] = [];
  if (isFeatureEnabled(addSynonymFeature)) {
    rows.push({ key: 'S', desc: 'Add as synonym' });
  }
  if (isFeatureEnabled(sentenceCycleFeature)) {
    rows.push({ key: 'Tab', desc: 'Cycle example sentences' });
  }
  if (isFeatureEnabled(editOnLeftFeature)) {
    rows.push({ key: 'Left', desc: 'Edit wrong answer' });
  }
  return rows;
}
