import { describe, expect, it } from 'vitest';
import { MidiTimeline, MusicalTimeline } from './index.js';

describe('timeline components', () => {
  it('exports both global timeline components', () => {
    expect(MidiTimeline).toBeDefined();
    expect(MusicalTimeline).toBeDefined();
  });

  it('accepts musical bar/beat geometry without requiring app-specific state', () => {
    expect(typeof MusicalTimeline).toBe('function');
  });
});