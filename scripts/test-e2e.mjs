// Always test against an isolated local Auth double and embedded PostgreSQL.
// Never submit test users/passwords to the configured real Supabase project.
import { spawnSync } from 'node:child_process';
const env = { ...process.env, WBIFY_TEST_BUILD: '1', APP_URL: 'http://127.0.0.1:3100', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54329', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-test-public-key' };
for (const args of [['node_modules/next/dist/bin/next','build'], ['node_modules/@playwright/test/cli.js','test']]) {
  const result = spawnSync(process.execPath,args,{ env,stdio:'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
