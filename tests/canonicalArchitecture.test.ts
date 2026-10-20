import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Floks canonical Frnl architecture', () => {
  const pkg = JSON.parse(readFileSync(new URL('../packages/ui/package.json', import.meta.url), 'utf8'));
  const manifest = JSON.parse(readFileSync(new URL('../packages/ui/floks.manifest.json', import.meta.url), 'utf8'));
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

  it('does not expose the retired hierarchy as a public package surface', () => {
    expect(pkg.exports['./hierarchy']).toBeUndefined();
    expect(pkg.scripts.build).not.toContain('hierarchy/index.ts');
  });

  it('declares the React + FrnlTS model', () => {
    expect(manifest.architecture.model).toBe('react-frnl');
    expect(readme).not.toContain('UI Primitive:');
    expect(readme).not.toContain('UI Composite:');
  });
});
