/**
 * @file floks.test.ts
 * @description Verification suite for @floks/ui and @floks/canvas-ui packages.
 */

import { describe, it, expect } from 'vitest';
import * as FloksUI from '../packages/ui/dist/index.js';
import * as FloksCanvasUI from '../packages/canvas-ui/dist/index.js';

describe('Floks Public Frontend & UI Package Library (@floks/*)', () => {
  it('exports canonical React components plus FrnlTS runtime integration', () => {
    expect(FloksUI.BaseButton).toBeDefined();
    expect(FloksUI.BaseInput).toBeDefined();
    expect(FloksUI.ModalContainer).toBeDefined();
    expect(FloksUI.WorkspaceTilesMenu).toBeDefined();
    expect(FloksUI.floksFrnlStore).toBeDefined();
    expect(FloksUI.FrnlStoreProvider).toBeDefined();
    expect(FloksUI.useFloksFrnlStore).toBeDefined();

    expect(FloksUI.frnlButton).toBeDefined();
    expect(FloksUI.frnlTextInput).toBeDefined();
    expect(FloksUI.frnlSelect).toBeDefined();
    expect(FloksUI.frnlToggle).toBeDefined();
    expect(FloksUI.frnlSlider).toBeDefined();
    expect(FloksUI.frnlBadge).toBeDefined();
    expect(FloksUI.frnlTabWindow).toBeDefined();
    expect(FloksUI.frnlTopBar).toBeDefined();
    expect(FloksUI.frnlBottomBar).toBeDefined();
    expect(FloksUI.frnlPage).toBeDefined();
    expect(FloksUI.ButtonParent).toBeUndefined();
    expect(FloksUI.PanelParent).toBeUndefined();
  });

  it('exports @floks/canvas-ui visual canvas, dock, tile-menu, editor, 2D node graph, and predictive components', () => {
    expect(FloksCanvasUI.InfiniteCanvas).toBeDefined();
    expect(FloksCanvasUI.DockBar).toBeDefined();
    expect(FloksCanvasUI.TileGrid).toBeDefined();
    expect(FloksCanvasUI.MonacoEditor).toBeDefined();
    // Generalized 2D Graph & Predictive UI
    expect(FloksCanvasUI.Node2DBase).toBeDefined();
    expect(FloksCanvasUI.NodeRenderer2D).toBeDefined();
    expect(FloksCanvasUI.Socket2D).toBeDefined();
    expect(FloksCanvasUI.Wire2D).toBeDefined();
    expect(FloksCanvasUI.PredictiveGhostNodeCard).toBeDefined();
    expect(FloksCanvasUI.PredictiveHudToolbar).toBeDefined();
    expect(FloksCanvasUI.PredictiveLayer2D).toBeDefined();
    expect(FloksCanvasUI.usePredictiveGraph2D).toBeDefined();
  });
});
