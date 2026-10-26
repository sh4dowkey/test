// Strict production build: fails if any content still carries a `review` flag in src/data/site.ts.
import { spawnSync } from 'node:child_process';
const r = spawnSync('npx', ['astro', 'build'], { stdio: 'inherit', shell: true, env: { ...process.env, ANANT_STRICT: '1' } });
process.exit(r.status ?? 1);
