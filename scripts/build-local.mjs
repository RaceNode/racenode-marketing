// Local production build with the real catalog: `cle /main --projet racenode -- npm run build:local`.
// Infisical names the site's key MOTORSPORT_DATA_API_KEY_SITE; the build (like Cloudflare Pages) reads MOTORSPORT_DATA_API_KEY.
import { spawnSync } from 'node:child_process';

const key = process.env.MOTORSPORT_DATA_API_KEY || process.env.MOTORSPORT_DATA_API_KEY_SITE;
if (!key) {
  console.error(
    'build:local: no MOTORSPORT_DATA_API_KEY(_SITE); run it as `cle /main --projet racenode -- npm run build:local`',
  );
  process.exit(1);
}
const r = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, MOTORSPORT_DATA_API_KEY: key },
});
process.exit(r.status ?? 1);
