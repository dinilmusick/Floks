import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('WorkspaceGate canonical storage boundary', () => {
  it('forwards storage options and policy to the canonical Floks tiles menu', () => {
    const source = readFileSync('packages/ui/src/components/workspace/WorkspaceGate.tsx', 'utf8');
    expect(source).toContain('storageOptions?: WorkspaceStorageOption[]');
    expect(source).toContain('visibility?: WorkspaceCreateDialogVisibility');
    expect(source).toContain('storageOptions={storageOptions}');
    expect(source).toContain('visibility={visibility}');
  });
});
