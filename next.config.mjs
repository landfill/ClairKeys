/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if ESLint errors are present
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if TypeScript errors are present
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizeCss: true,
  },
  // Disable caching in development to prevent piano keyboard issues
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
  }),
  // Long-lived caching for the recorded piano samples.
  //
  // Next.js serves `public/` with `max-age=0, must-revalidate`, so without this
  // every session pays 30 revalidation round trips before the first note can
  // sound. The files are content-stable — a different sample set would be a
  // different build — so `immutable` is accurate rather than merely convenient.
  //
  // This lives in `next.config.mjs` rather than `next.config.ts` because Next
  // resolves `next.config.js`, then `.mjs`, then `.ts` and stops at the first
  // hit (`next/dist/shared/lib/constants.js`), so the `.ts` file in this
  // repository is never loaded. That duplicate config is a separate defect and
  // is deliberately not fixed here.
  async headers() {
    return [
      {
        source: '/samples/piano/:file*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https', 
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig