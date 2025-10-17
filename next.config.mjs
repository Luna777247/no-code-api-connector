/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Fix webpack cache issues on Windows
  webpack: (config, { isServer }) => {
    // Use memory cache on Windows to avoid ENOENT file rename errors
    if (process.platform === 'win32') {
      config.cache = {
        type: 'memory',
      }
    }
    return config
  },
}

export default nextConfig
