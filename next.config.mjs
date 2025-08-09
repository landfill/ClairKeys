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
}

export default nextConfig