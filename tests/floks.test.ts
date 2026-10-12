/**
 * @file floks.test.ts
 * @description Verification suite for @floks/ui and @floks/canvas-ui packages.
 */

import { describe, it, expect } from 'vitest';
import * as FloksUI from '../packages/ui/src/index.js';
import * as FloksCanvasUI from '../packages/canvas-ui/src/index.js';

describe('Floks Public Frontend & UI Package Library (@floks/*)', () => {
  it('exports @floks/ui base primitives, containers, composite, layout, and theme engine', () => {
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
  });

  it('exports @floks/canvas-ui visual canvas, dock, tile-menu, and editor components', () => {
    expect(FloksCanvasUI.InfiniteCanvas).toBeDefined();
    expect(FloksCanvasUI.DockBar).toBeDefined();
    expect(FloksCanvasUI.TileGrid).toBeDefined();
    expect(FloksCanvasUI.MonacoEditor).toBeDefined();
  });
});
