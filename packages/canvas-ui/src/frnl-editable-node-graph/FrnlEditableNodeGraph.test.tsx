import { describe, expect, it } from 'vitest';
import { frnlEditableNodeGraphDefinition } from './FrnlEditableNodeGraph.js';

describe('FRNL Editable Node Graph', () => {
  it('defines the graph as a first-class FRNL component with magnetic trace events', () => {
    expect(frnlEditableNodeGraphDefinition.name).toBe('frnlEditableNodeGraph');
    expect(frnlEditableNodeGraphDefinition.states.idle.events.magneticTraceSolidify).toBeDefined();
    expect(frnlEditableNodeGraphDefinition.states.idle.phases?.sustainPhase).toBeDefined();
  });

  it('keeps autocomplete and compatible-node selection as graph capabilities', () => {
    expect(frnlEditableNodeGraphDefinition.states.idle.events.nodesChange).toBeDefined();
    expect(frnlEditableNodeGraphDefinition.states.idle.events.edgesChange).toBeDefined();
  });
});
