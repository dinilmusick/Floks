import React, { createContext, useContext, type ReactNode } from 'react';
import { createFrnlStore, type FrnlStore } from '@dinilmusick/frnlts';

export type { FrnlStore };

/**
 * Default canonical shared FrnlTS semantic store for Floks UI assets.
 * For application-level custom store isolation, prefer using `FrnlStoreProvider`.
 */
export const floksFrnlStore: FrnlStore = createFrnlStore();

/**
 * Returns the currently active global Frnl store (defaults to `floksFrnlStore`).
 */
export function getFloksFrnlStore(): FrnlStore {
  return floksFrnlStore;
}

const FrnlStoreContext = createContext<FrnlStore | null>(null);

export interface FrnlStoreProviderProps {
  store: FrnlStore;
  children: ReactNode;
}

/**
 * Context provider allowing applications to inject an isolated or shared Frnl store
 * down a specific component subtree. This is the preferred mechanism for custom store injection.
 */
export const FrnlStoreProvider: React.FC<FrnlStoreProviderProps> = ({ store, children }) => {
  return React.createElement(FrnlStoreContext.Provider, { value: store }, children);
};

/**
 * Hook to access the active Frnl store: prefers React Context if provided via FrnlStoreProvider,
 * falling back to the canonical default floksFrnlStore.
 */
export function useFloksFrnlStore(): FrnlStore {
  const contextStore = useContext(FrnlStoreContext);
  return contextStore ?? floksFrnlStore;
}
