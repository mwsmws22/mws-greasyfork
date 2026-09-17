// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { watchBodyRemounts } from './remount';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('watchBodyRemounts', () => {
  it('does not storm when the callback always mutates the observed tree', async () => {
    document.body.innerHTML = '<div id="host"></div>';
    const host = document.getElementById('host')!;

    let deliveries = 0;
    const stop = watchBodyRemounts(() => {
      deliveries += 1;
      if (deliveries > 40) {
        return;
      }
      // Deliberately not idempotent: every call writes the DOM.
      host.append(document.createElement('span'));
    });

    host.append(document.createElement('span'));
    for (let i = 0; i < 10; i += 1) {
      await Promise.resolve();
    }
    stop();

    expect(deliveries).toBeLessThan(5);
  });
});
