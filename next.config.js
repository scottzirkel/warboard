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
  // Include 40k-data JSON files in Vercel function bundles
  // (readFileSync with dynamic paths isn't traced by the bundler)
  outputFileTracingIncludes: {
    '/api/faction/\\[army\\]': ['./node_modules/@scottzirkel/40k-data/data/**'],
  },
  // Allow dev to use Turbopack while build uses webpack (for Serwist PWA)
  turbopack: {},
}

module.exports = withSerwist(nextConfig)
