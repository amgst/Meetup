// Always test against an isolated local Auth double and embedded PostgreSQL.
// Never submit test users/passwords to the configured real Supabase project.
import { spawnSync } from 'node:child_process';
// Deliberately stale APP_URL exercises the hosted-to-localhost redirect regression.
const env = { ...process.env, WBIFY_TEST_BUILD: '1', LIVEKIT_URL:'ws://127.0.0.1:54329', LIVEKIT_API_KEY:'local-test-livekit-key', LIVEKIT_API_SECRET:'local-test-livekit-secret-at-least-32-characters', SUPABASE_SERVICE_ROLE_KEY:'local-test-service-key', APP_URL: 'http://localhost:3000', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54329', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-test-public-key' };
for (const args of [['node_modules/next/dist/bin/next','build'], ['node_modules/@playwright/test/cli.js','test',...process.argv.slice(2)]]) {
  const result = spawnSync(process.execPath,args,{ env,stdio:'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
