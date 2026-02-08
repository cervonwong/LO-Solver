import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@mastra/core',
    '@mastra/libsql',
    '@mastra/memory',
    '@mastra/loggers',
    '@mastra/observability',
  ],
};

export default nextConfig;
