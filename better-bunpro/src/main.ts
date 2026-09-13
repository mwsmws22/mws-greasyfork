import { registerFeature, startEnabledFeatures } from './features/registry';
import { exampleSentenceFeature } from './features/example-sentence/feature';
import { sentenceCycleFeature } from './features/sentence-cycle/feature';
import { mountSettingsLaunchers } from './settings/launcher';

registerFeature(exampleSentenceFeature);
registerFeature(sentenceCycleFeature);

mountSettingsLaunchers();
startEnabledFeatures();
