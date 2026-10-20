import { describe, expect, it } from 'vitest';
import { ConnectionRuleStore, MagneticGraphManager } from '@kloks/state-graph';
import type { GraphNode } from '@kloks/state-graph';
import { frnlEditableNodeGraphDefinition } from './FrnlEditableNodeGraph.js';

describe('FRNL Editable Node Graph', () => {
  it('defines the graph as a first-class FRNL component with magnetic trace events', () => {
    expect(frnlEditableNodeGraphDefinition.name).toBe('frnlEditableNodeGraph');
    expect(frnlEditableNodeGraphDefinition.states.idle.events.magneticTraceSolidify).toBeDefined();
    expect(frnlEditableNodeGraphDefinition.states.idle.phases?.sustainPhase).toBeDefined();
  });

  it('retains the QWNSR graph capabilities through the FLOKS graph infrastructure', () => {
    ConnectionRuleStore.initializeDefaults();

    const source: GraphNode = {
      id: 'source',
      type: 'source',
      label: 'Source',
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [{ id: 'out', label: 'Out', type: 'output', dataType: 'AUDIO_STEREO' }],
    } as GraphNode;
    const target: GraphNode = {
      id: 'target',
      type: 'target',
      label: 'Target',
      position: { x: 10, y: 10 },
      inputs: [{ id: 'in', label: 'In', type: 'input', dataType: 'AUDIO_STEREO' }],
      outputs: [],
    } as GraphNode;

    const traces = new MagneticGraphManager(320).computeTraces([source, target]);
    expect(traces.some(
      (trace) =>
        trace.sourceNodeId === 'source' &&
        trace.targetNodeId === 'target' &&
        trace.sourceHandleId === 'out' &&
        trace.targetHandleId === 'in'
    )).toBe(true);
  });
});
