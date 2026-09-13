import { readStored, writeStored } from '../settings/store';

/** Whose idea a feature was, for features that are somebody else's. */
export interface FeatureCredit {
  author: string;
  authorUrl: string;
  work: string;
  workUrl: string;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  credit?: FeatureCredit;
  enabledByDefault: boolean;
  start(): void;
  stop(): void;
}

const features: Feature[] = [];
const running = new Set<string>();

export function registerFeature(feature: Feature): void {
  features.push(feature);
}

export function listFeatures(): readonly Feature[] {
  return features;
}

export function isFeatureEnabled(feature: Feature): boolean {
  return readStored(enabledKey(feature), feature.enabledByDefault);
}

export function setFeatureEnabled(feature: Feature, enabled: boolean): void {
  writeStored(enabledKey(feature), enabled);
  syncFeature(feature);
}

export function startEnabledFeatures(): void {
  for (const feature of features) {
    syncFeature(feature);
  }
}

function syncFeature(feature: Feature): void {
  const shouldRun = isFeatureEnabled(feature);
  if (shouldRun === running.has(feature.id)) {
    return;
  }
  if (shouldRun) {
    feature.start();
    running.add(feature.id);
  } else {
    feature.stop();
    running.delete(feature.id);
  }
}

function enabledKey(feature: Feature): string {
  return `feature.${feature.id}.enabled`;
}
