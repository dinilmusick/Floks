import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const workflow = fs.readFileSync('.github/workflows/npm-release.yml', 'utf8');

describe('Floks trusted npm release regression checks', () => {
  it('uses maintained Node 24 GitHub Action runtimes', () => {
    expect(workflow).toContain('uses: actions/checkout@v5');
    expect(workflow).toContain('uses: actions/setup-node@v5');
    expect(workflow).toContain('uses: pnpm/action-setup@v5');
  });

  it('does not hide delayed npm registry propagation or retry immutable publishing', () => {
    expect(workflow).toContain('steps.registry.outputs.exists == \'false\'');
    expect(workflow).toContain('Cache-Control: no-cache');
    expect(workflow).toContain('seq 1 60');
    expect(workflow).toContain('retry this workflow with publish=false');
    expect(workflow).toContain('sha512-');
    expect(workflow).toContain('meta.dist.integrity');
    expect(workflow).toContain('attestation.sourceCommit !== process.env.SOURCE_SHA');
  });

  it('contains syntactically valid bash in the independent verification block', () => {
    const start = workflow.indexOf('      - name: Verify public registry artifact independently');
    const end = workflow.indexOf('      - name: Existing version is not evidence of this source release', start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const section = workflow.slice(start, end);
    const runStart = section.indexOf('        run: |\n');
    expect(runStart).toBeGreaterThan(0);
    const bash = section.slice(runStart + '        run: |\n'.length)
      .split('\n')
      .map((line) => {
        if (!line.trim()) return '';
        expect(line.startsWith('          ')).toBe(true);
        return line.slice(10);
      })
      .join('\n');
    const checked = spawnSync('bash', ['-n'], { input: bash, encoding: 'utf8' });
    expect(checked.status, checked.stderr || checked.error?.message).toBe(0);
  });
});
