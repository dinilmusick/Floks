import { describe, expect, it } from 'vitest';
import { themePackToFrnlTheme } from '../packages/contracts/src/frnlThemeAdapter.js';

describe('Theta/Floks -> Frnl theme bridge', () => {
  it('maps base parameters and state overrides into Frnl visual parameters', () => {
    const result = themePackToFrnlTheme({
      themeId: 'dark',
      name: 'Dark',
      version: '1.0.0',
      target: {
        library: '@ultrst-armada/floks',
        componentId: 'Button',
        componentVersion: '1.2.5',
        contractVersion: '1.0.0',
      },
      slots: [],
      states: [{ stateId: 'pressed', parameterOverrides: { color: '#fff' } }],
      parameters: { color: '#000', radius: 4 },
      assetTypes: [],
    });

    expect(result.target.componentId).toBe('Button');
    expect(result.baseVisualParameters.radius).toBe(4);
    expect(result.states.pressed.visualParameters).toEqual({ color: '#fff', radius: 4 });
  });
});
