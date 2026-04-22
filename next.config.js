/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@isa/ui-web', '@isa/core', '@isa/theme', '@isa/transport', '@isa/hooks'],
  // Produce a standalone build for Docker deployment
  output: 'standalone',
  env: {
    // REACT_APP_* vars are still referenced in src/config/index.ts and src/app.tsx.
    // Next.js only auto-inlines NEXT_PUBLIC_* vars, so these need explicit passthrough.
    REACT_APP_AGENT_SERVICE_URL: process.env.REACT_APP_AGENT_SERVICE_URL,
    REACT_APP_USER_SERVICE_URL: process.env.REACT_APP_USER_SERVICE_URL,
    REACT_APP_MODEL_SERVICE_URL: process.env.REACT_APP_MODEL_SERVICE_URL,
  },
  webpack: (config) => {
    const path = require('path');
    const sdkRoot = path.resolve(__dirname, '../isA_App_SDK/packages');

    // Resolve @isa/* packages to source (dist may not be built)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@isa/core': path.join(sdkRoot, 'core/src'),
      '@isa/ui-web': path.join(sdkRoot, 'ui-web/src'),
      '@isa/theme': path.join(sdkRoot, 'theme/src'),
      '@isa/transport': path.join(sdkRoot, 'transport/src'),
      '@isa/hooks': path.join(sdkRoot, 'hooks/src'),
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      child_process: false,
      dns: false,
      // OpenTelemetry — not needed in frontend, stub out
      '@opentelemetry/sdk-trace-web': false,
      '@opentelemetry/resources': false,
      '@opentelemetry/semantic-conventions': false,
      '@opentelemetry/sdk-trace-base': false,
      '@opentelemetry/exporter-trace-otlp-http': false,
      '@opentelemetry/core': false,
      '@opentelemetry/auto-instrumentations-web': false,
      '@opentelemetry/instrumentation': false,
      'web-vitals': false,
    };
    return config;
  },
}

module.exports = nextConfig
