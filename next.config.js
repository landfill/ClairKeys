/** @type {import('next').NextConfig} */
const nextConfig = {
  // 이미지 도메인 설정
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  webpack: (config, { isServer, dev }) => {
    // Turbopack을 사용하지 않을 때만 webpack 설정 적용
    if (dev && process.env.TURBOPACK) {
      return config
    }

    // 오디오 관련 라이브러리 처리
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      }
    }

    // standardized-audio-context 관련 모듈 해결
    config.resolve.alias = {
      ...config.resolve.alias,
      // 오디오 컨텍스트 관련 타입들을 무시하거나 대체
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
  
  // 서버 외부 패키지 설정 (Next.js 15에서 변경됨)
  serverExternalPackages: ['tone', 'standardized-audio-context'],

  // 캐싱 최적화 헤더 설정
  async headers() {
    return [
      // 정적 자원 캐싱 (이미지, 폰트, CSS, JS)
      {
        source: '/(.*\\.(ico|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot|otf))',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable', // 1년
          },
        ],
      },
      // CSS/JS 파일 캐싱
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable', // 1년
          },
        ],
      },
      // API 응답 캐싱 (짧은 시간)
      {
        source: '/api/sheet/public',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600', // 5분 캐시, 10분 stale
          },
        ],
      },
      // 카테고리 API 캐싱
      {
        source: '/api/categories',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=60, stale-while-revalidate=120', // 1분 캐시, 2분 stale
          },
        ],
      },
      // 애니메이션 데이터 캐싱
      {
        source: '/api/files/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=3600, stale-while-revalidate=7200', // 1시간 캐시, 2시간 stale
          },
        ],
      },
    ]
  },

  // 정적 파일 처리
  async rewrites() {
    return [
      // 오디오 관련 타입 파일 요청을 무시
      {
        source: '/src/types/:path*',
        destination: '/404',
      },
    ]
  },
}

module.exports = nextConfig