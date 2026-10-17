import React, { createContext, useContext, type ReactNode } from 'react';
import { createFrnlStore, type FrnlStore } from '@dinilmusick/frnlts';

export type { FrnlStore };

/** Canonical shared FrnlTS semantic store for Floks UI assets. */
let activeFrnlStore: FrnlStore = createFrnlStore();

export const floksFrnlStore: FrnlStore = activeFrnlStore;

/**
 * Returns the currently active canonical Frnl store.
 */
export function getFloksFrnlStore(): FrnlStore {
  return activeFrnlStore;
}

/**
 * Injects a custom Frnl store as the canonical store across Floks assets.
 */
export function setFloksFrnlStore(store: FrnlStore): void {
  activeFrnlStore = store;
}

const FrnlStoreContext = createContext<FrnlStore | null>(null);

export interface FrnlStoreProviderProps {
  store: FrnlStore;
  children: ReactNode;
}

/**
 * Context provider allowing applications to inject an isolated or shared Frnl store
 * down a specific component subtree.
 */
export const FrnlStoreProvider: React.FC<FrnlStoreProviderProps> = ({ store, children }) => {
  return React.createElement(FrnlStoreContext.Provider, { value: store }, children);
};

/**
 * Hook to access the active Frnl store: prefers React Context if provided,
 * falling back to the canonical shared floksFrnlStore.
 */
export function useFloksFrnlStore(): FrnlStore {
  const contextStore = useContext(FrnlStoreContext);
  return contextStore ?? activeFrnlStore;
}
