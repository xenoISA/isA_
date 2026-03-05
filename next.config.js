/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // REACT_APP_* vars are still referenced in src/config/index.ts and src/app.tsx.
    // Next.js only auto-inlines NEXT_PUBLIC_* vars, so these need explicit passthrough.
    REACT_APP_AGENT_SERVICE_URL: process.env.REACT_APP_AGENT_SERVICE_URL,
    REACT_APP_USER_SERVICE_URL: process.env.REACT_APP_USER_SERVICE_URL,
    REACT_APP_MODEL_SERVICE_URL: process.env.REACT_APP_MODEL_SERVICE_URL,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
}

module.exports = nextConfig
