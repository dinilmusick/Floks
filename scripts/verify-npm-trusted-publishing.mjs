import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/npm-release.yml', import.meta.url), 'utf8');
const failures = [];
if (!/^  id-token: write$/m.test(workflow)) failures.push('GitHub Actions id-token: write permission is required.');
if (!/registry-url: https:\/\/registry\.npmjs\.org\//.test(workflow)) failures.push('setup-node must configure the npm registry.');
if (!/npm install --global npm@latest/.test(workflow)) failures.push('The release job must use a current npm CLI with Trusted Publishing support.');
if (!/npm publish --provenance --access public/.test(workflow)) failures.push('Publishing must use npm provenance.');
if (/NPM_TOKEN|NODE_AUTH_TOKEN|_authToken/.test(workflow)) failures.push('Long-lived npm token authentication is forbidden in the release workflow.');
// Release reproducibility is a verified contract, not merely an OIDC keyword match.
for (const required of [
  'ref: ${{ github.sha }}',
  'test "$(git rev-parse HEAD)" = "$EXPECTED_SHA"',
  'pnpm install --frozen-lockfile',
  'pnpm run typecheck',
  'pnpm run test',
  'pnpm run test:consumer-browser',
  'pnpm run test:consumer-server',
  'npm pack --pack-destination',
  "github.ref == 'refs/heads/main'",
  "inputs.publish",
  "steps.registry.outputs.exists == 'false'",
]) {
  if (!workflow.includes(required)) failures.push('Missing exact-head or package release gate: ' + required);
}
for (const forbidden of ['npm-check-updates', 'git push', 'pnpm install --lockfile-only', '--no-frozen-lockfile', 'workflow_run:', 'schedule:']) {
  if (workflow.includes(forbidden)) failures.push('Unsafe hidden dependency mutation in release: ' + forbidden);
}
if (/^  (?:schedule|push):/m.test(workflow)) {
  failures.push('Release must not modify dependencies or publish on unverified schedule/push events.');
}
if (failures.length) throw new Error(failures.join('\n'));
console.log('NPM TRUSTED PUBLISHING VERIFIED: OIDC only; no long-lived token fallback.');
