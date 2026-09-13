import { registerFeature, startEnabledFeatures } from './features/registry';
import { exampleSentenceFeature } from './features/example-sentence/feature';
import { mountSettingsLaunchers } from './settings/launcher';

registerFeature(exampleSentenceFeature);

mountSettingsLaunchers();
startEnabledFeatures();
