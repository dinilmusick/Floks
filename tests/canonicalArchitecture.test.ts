import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Floks canonical Frnl architecture', () => {
  const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'packages/ui/package.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'packages/ui/floks.manifest.json'), 'utf8'));
  const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8');

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
