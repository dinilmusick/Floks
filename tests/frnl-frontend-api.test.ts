import { describe, expect, it } from 'vitest';
import { floksFrnlFrontendApi, floksFrnlStore } from '../packages/ui/src/frnl/store.js';

describe('Floks AI-native frontend API', () => {
  it('installs one canonical programmatic API for the shared Frnl store', () => {
    expect(floksFrnlFrontendApi.inspect().apiVersion).toBe(1);
    expect((globalThis as { __FRNL_FRONTEND_API__?: unknown }).__FRNL_FRONTEND_API__).toBe(floksFrnlFrontendApi);
  });

  it('observes the shared store without application-authored API glue', () => {
    floksFrnlStore.getState().registerEntity('api-test', {
      state: 'idle',
      properties: { label: 'API Test' },
    });
    const snapshot = floksFrnlFrontendApi.inspect();
    expect(snapshot.components.some((component) => component.id === 'api-test')).toBe(true);
    floksFrnlStore.getState().unregisterEntity('api-test');
  });
});
