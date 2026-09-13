import { registerFeature, startEnabledFeatures } from './features/registry';
import { exampleSentenceFeature } from './features/example-sentence/feature';
import { humanTermAudioFeature } from './features/human-term-audio/feature';
import { keepGuessingFeature } from './features/keep-guessing/feature';
import { sentenceCycleFeature } from './features/sentence-cycle/feature';
import { mountSettingsLaunchers } from './settings/launcher';

registerFeature(exampleSentenceFeature);
registerFeature(sentenceCycleFeature);
registerFeature(keepGuessingFeature);
registerFeature(humanTermAudioFeature);

mountSettingsLaunchers();
startEnabledFeatures();
