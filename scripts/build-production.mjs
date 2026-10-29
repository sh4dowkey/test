// Strict production build: refuses to build while any `review` flag remains in src/data/site.ts or src/data/cerberus.ts.
// Flags mark facts the owner has not confirmed. Resolve a flag by confirming the fact and deleting the `review` line;
// never delete a flag only to make this pass. Plain `npm run build` ignores flags so development is not blocked.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const flags = [];
for (const f of ['src/data/site.ts', 'src/data/cerberus.ts']) {
  readFileSync(f, 'utf8').split('\n').forEach((l, i) => { const m = l.match(/^(?!\s*(\/\/|\*|\/\*)).*\breview\s*:\s*'([^']+)'/); if (m) flags.push(`${f}:${i + 1}  ${m[2]}`); });
}
if (flags.length) {
  console.error(`\nStrict build blocked: ${flags.length} unconfirmed fact(s) still flagged for review:\n` + flags.map((f) => '  - ' + f).join('\n') + '\n');
  process.exit(1);
}
const r = spawnSync('npx', ['astro', 'build'], { stdio: 'inherit', shell: true });
process.exit(r.status ?? 1);
