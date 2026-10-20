export * from './theme/index.js';
export * from './components/base/index.js';
export * from './components/containers/index.js';
export * from './components/composite/index.js';
export * from './components/layout/index.js';
export * from './components/bottom-strip/index.js';
export * from './components/settings/index.js';
export * from './components/auth/index.js';
export * from './components/workspace/index.js';
export * from './palette/index.js';
export * from './frnl/store.js';
export type { ColorPalette } from './palette/index.js';
export { BUILTIN_PALETTES, DEFAULT_PALETTE_ID } from './palette/index.js';

export {
  floksFrnlStore,
  getFloksFrnlStore,
  FrnlStoreProvider,
  useFloksFrnlStore,
} from './frnl/store.js';

// Canonical FrnlTS-backed Components (frnl* prefix standard)
export * from './frnl/index.js';