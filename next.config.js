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