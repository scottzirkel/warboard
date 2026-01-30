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
  serverExternalPackages: [
    '@libsql/client',
    '@prisma/adapter-libsql',
    'libsql',
  ],
  // Allow dev to use Turbopack while build uses webpack (for Serwist PWA)
  turbopack: {},
}

module.exports = withSerwist(nextConfig)
