import type { NextConfig } from 'next';
const config: NextConfig = { poweredByHeader: false, distDir: process.env.WBIFY_TEST_BUILD === '1' ? '.next-test' : '.next' };
export default config;
