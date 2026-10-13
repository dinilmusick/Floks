/**
 * @file floks.test.ts
 * @description Verification suite for @floks/ui and @floks/canvas-ui packages.
 */

import { describe, it, expect } from 'vitest';
import * as FloksUI from '../packages/ui/dist/index.js';
import * as FloksCanvasUI from '../packages/canvas-ui/dist/index.js';

describe('Floks Public Frontend & UI Package Library (@floks/*)', () => {
  it('exports @floks/ui base primitives, containers, composite, layout, hierarchy, and theme engine', () => {
    expect(FloksUI.BaseButton).toBeDefined();
    expect(FloksUI.BaseInput).toBeDefined();
    expect(FloksUI.BaseSelect).toBeDefined();
    expect(FloksUI.ModalContainer).toBeDefined();
    expect(FloksUI.DrawerContainer).toBeDefined();
    expect(FloksUI.FloatingDetailsPanel).toBeDefined();
    expect(FloksUI.ConfirmDialog).toBeDefined();
    expect(FloksUI.EmptyState).toBeDefined();
    expect(FloksUI.AppShell).toBeDefined();
    expect(FloksUI.TopToolbar).toBeDefined();
    expect(FloksUI.BottomStrip).toBeDefined();
    expect(FloksUI.WorkspaceTilesMenu).toBeDefined();
    // Generalized UI Hierarchy & Palette Engine
    expect(FloksUI.UIElementBase).toBeDefined();
    expect(FloksUI.UIModel).toBeDefined();
    expect(FloksUI.ButtonParent).toBeDefined();
    expect(FloksUI.PanelParent).toBeDefined();
    expect(FloksUI.SliderInput).toBeDefined();
    expect(FloksUI.TextInput).toBeDefined();
    expect(FloksUI.SelectInput).toBeDefined();
    expect(FloksUI.ToggleInput).toBeDefined();
    expect(FloksUI.TileParent).toBeDefined();
    expect(FloksUI.Badge).toBeDefined();
    expect(FloksUI.TelemetryPill).toBeDefined();
    expect(FloksUI.StatusDot).toBeDefined();
    expect(FloksUI.ThemeProvider).toBeDefined();
    expect(FloksUI.usePalette).toBeDefined();
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
