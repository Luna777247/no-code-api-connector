/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true,
    externalDir: true,
  },
  webpack: (config) => {
    const path = require('path')
    // Map alias '@' to the repository root so that "@/components/ui/*" resolves
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, '..'),
    }
    return config
  },
}

module.exports = nextConfig
