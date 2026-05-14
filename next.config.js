const withSerwist = require('@serwist/next').default({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  // Enable WebAssembly for Prisma Cloudflare runtime client
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
  // Allow dev to use Turbopack while build uses webpack (for Serwist PWA)
  turbopack: {},
}

module.exports = withSerwist(nextConfig)

// Initialize Cloudflare bindings for next dev (D1, etc.)
import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
