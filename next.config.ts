import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Experimental features for performance
  experimental: {
    optimizeCss: true,
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/u/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // Server external packages (Next.js 15 style)
  serverExternalPackages: ['tone', 'standardized-audio-context', '@prisma/client'],

  // Webpack configuration for performance
  webpack: (config, { buildId, dev, isServer, webpack }) => {
    // Performance optimizations
    if (!dev && !isServer) {
      // Split chunks for better caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true,
            },
            // Separate chunks for large libraries
            tone: {
              test: /[\\/]node_modules[\\/]tone[\\/]/,
              name: 'tone',
              chunks: 'all',
              priority: 20,
            },
            prisma: {
              test: /[\\/]node_modules[\\/]@prisma[\\/]/,
              name: 'prisma',
              chunks: 'all',
              priority: 20,
            },
          },
        },
      }

      // Bundle analyzer (only in production)
      if (process.env.ANALYZE === 'true') {
        try {
          const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
          config.plugins.push(
            new BundleAnalyzerPlugin({
              analyzerMode: 'static',
              openAnalyzer: false,
              reportFilename: 'bundle-analysis.html',
            })
          )
        } catch (e) {
          console.warn('Bundle analyzer plugin not available')
        }
      }
    }

    // Handle canvas module for server-side rendering - Updated for ARM compatibility
    if (isServer) {
      config.externals.push('@napi-rs/canvas')
    }

    // Audio context resolution for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      }
    }

    // Resolve audio-related module aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/types/oscillator-node-constructor-factory': false,
      '@/types/oscillator-node-renderer-factory': false,
      '@/types/oscillator-node-renderer': false,
      '@/types/oscillator-node-renderer-factory-factory': false,
      '@/types/oscillator-type': false,
      '@/types/output-connection': false,
      '@/types/over-sample-type': false,
    }

    return config
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Performance headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
      // Static assets caching (Next.js 15 compatible)
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Images caching
      {
        source: '/_next/image:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Service Worker
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      // Static file extensions (Next.js 15 compatible pattern)
      {
        source: '/:path*\\.(ico|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot|otf)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API caching - Public sheets
      {
        source: '/api/sheet/public',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      // API caching - Categories
      {
        source: '/api/categories',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=60, stale-while-revalidate=120',
          },
        ],
      },
      // API caching - Animation files
      {
        source: '/api/files/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=3600, stale-while-revalidate=7200',
          },
        ],
      },
    ]
  },

  // Enable gzip compression
  compress: true,

  // Redirects for performance (avoid client-side redirects)
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },

  // Rewrites for handling missing files
  async rewrites() {
    return [
      // Handle audio-related type file requests
      {
        source: '/src/types/:path*',
        destination: '/404',
      },
    ]
  },
};

export default nextConfig;
