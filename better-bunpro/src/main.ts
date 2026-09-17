import { registerFeature, startEnabledFeatures } from './features/registry';
import { addSynonymFeature } from './features/add-synonym/feature';
import { editOnLeftFeature } from './features/edit-on-left/feature';
import { exampleSentenceFeature } from './features/example-sentence/feature';
import { humanTermAudioFeature } from './features/human-term-audio/feature';
import { keepGuessingFeature } from './features/keep-guessing/feature';
import { sentenceCycleFeature } from './features/sentence-cycle/feature';
import { mountSettingsLaunchers } from './settings/launcher';
import { mountHotkeyGuide } from './ui/hotkey-guide-mount';

registerFeature(exampleSentenceFeature);
registerFeature(sentenceCycleFeature);
registerFeature(keepGuessingFeature);
registerFeature(humanTermAudioFeature);
registerFeature(addSynonymFeature);
registerFeature(editOnLeftFeature);

mountSettingsLaunchers();
mountHotkeyGuide();
startEnabledFeatures();
