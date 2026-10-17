import { describe, expect, it } from 'vitest';
import { floksFrnlStore } from './store.js';

describe('Floks Frnl integration', () => {
  it('provides a shared FrnlTS store for UI assets', () => {
    floksFrnlStore.getState().registerEntity('test.button', {
      kind: 'primitive', state: 'default', properties: { variant: 'primary' },
    });
    expect(floksFrnlStore.getState().entities['test.button']?.kind).toBe('primitive');
  });
});
