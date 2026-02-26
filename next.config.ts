import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@mastra/core', '@mastra/libsql', '@mastra/memory', 'better-sqlite3'],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
