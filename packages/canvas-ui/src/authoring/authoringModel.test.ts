import { describe, expect, it } from 'vitest';
import type { UIAuthoringNode } from '@ultrst-armada/kloks/contracts';
import { getAuthoringChildren, getAuthoringDepth } from './authoringModel.js';

const nodes: UIAuthoringNode[] = [
  { id: 'page', kind: 'page', name: 'Page', props: {} },
  { id: 'section', kind: 'section', name: 'Section', parentId: 'page', props: {} },
  { id: 'component', kind: 'component', name: 'Button', parentId: 'section', props: {} },
];

describe('UI authoring tree model', () => {
  it('calculates hierarchy depth', () => {
    expect(getAuthoringDepth(nodes[2], nodes)).toBe(2);
  });

  it('returns direct children only', () => {
    expect(getAuthoringChildren('section', nodes).map((node) => node.id)).toEqual(['component']);
  });
});
