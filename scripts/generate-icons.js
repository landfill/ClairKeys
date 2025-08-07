/**
 * PWA 아이콘 생성 스크립트
 * ClairKeys 로고를 다양한 크기의 PWA 아이콘으로 변환
 */

const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

// 필요한 아이콘 크기들
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512]

// 스플래시 화면 크기들 (iOS)
const splashSizes = [
  { width: 640, height: 1136, name: 'splash-640x1136.png' }, // iPhone 5/SE
  { width: 750, height: 1334, name: 'splash-750x1334.png' }, // iPhone 6/7/8
  { width: 1242, height: 2208, name: 'splash-1242x2208.png' }, // iPhone 6+/7+/8+
]

// 기본 로고 SVG (ClairKeys 테마)
const logoSVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="keys" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f8fafc;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- 배경 원형 -->
  <circle cx="256" cy="256" r="240" fill="url(#bg)" stroke="#1e40af" stroke-width="4"/>
  
  <!-- 피아노 건반들 -->
  <!-- 흰 건반 -->
  <g fill="url(#keys)" stroke="#e2e8f0" stroke-width="1">
    <rect x="160" y="180" width="32" height="120" rx="4"/>
    <rect x="200" y="180" width="32" height="120" rx="4"/>
    <rect x="240" y="180" width="32" height="120" rx="4"/>
    <rect x="280" y="180" width="32" height="120" rx="4"/>
    <rect x="320" y="180" width="32" height="120" rx="4"/>
  </g>
  
  <!-- 검은 건반 -->
  <g fill="#1f2937" stroke="#374151" stroke-width="1">
    <rect x="184" y="180" width="20" height="80" rx="3"/>
    <rect x="216" y="180" width="20" height="80" rx="3"/>
    <rect x="264" y="180" width="20" height="80" rx="3"/>
    <rect x="296" y="180" width="20" height="80" rx="3"/>
    <rect x="328" y="180" width="20" height="80" rx="3"/>
  </g>
  
  <!-- 음표 장식 -->
  <g fill="#fbbf24" opacity="0.8">
    <!-- 음표 1 -->
    <circle cx="200" cy="140" r="8"/>
    <rect x="206" y="120" width="3" height="28"/>
    <path d="M206,120 Q220,115 220,125 Q220,130 206,128" fill="#fbbf24"/>
    
    <!-- 음표 2 -->
    <circle cx="280" cy="160" r="6"/>
    <rect x="284" y="145" width="2" height="20"/>
    
    <!-- 음표 3 -->
    <circle cx="320" cy="135" r="7"/>
    <rect x="325" y="118" width="2.5" height="24"/>
  </g>
  
  <!-- ClairKeys 텍스트 -->
  <text x="256" y="360" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="28" font-weight="bold">ClairKeys</text>
</svg>
`

async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public')
  
  // public 폴더가 없으면 생성
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  try {
    // 기본 SVG를 PNG로 변환하여 베이스 이미지 생성
    const baseBuffer = Buffer.from(logoSVG)
    
    console.log('🎹 ClairKeys PWA 아이콘 생성 시작...')

    // 각 크기별 아이콘 생성
    for (const size of iconSizes) {
      const outputPath = path.join(publicDir, `icon-${size}.png`)
      
      await sharp(baseBuffer)
        .resize(size, size)
        .png({
          quality: 90,
          compressionLevel: 9
        })
        .toFile(outputPath)
      
      console.log(`✅ 생성완료: icon-${size}.png`)
    }

    // 파비콘 생성
    const faviconPath = path.join(publicDir, 'favicon.ico')
    await sharp(baseBuffer)
      .resize(32, 32)
      .png()
      .toFormat('png')
      .toFile(faviconPath.replace('.ico', '.png'))
    
    console.log('✅ 생성완료: favicon.png')

    // iOS 스플래시 화면 생성
    for (const splash of splashSizes) {
      const outputPath = path.join(publicDir, splash.name)
      
      // 스플래시 화면은 중앙에 로고를 배치하고 배경색 적용
      await sharp({
        create: {
          width: splash.width,
          height: splash.height,
          channels: 4,
          background: { r: 37, g: 99, b: 235, alpha: 1 } // ClairKeys 블루
        }
      })
      .composite([
        {
          input: await sharp(baseBuffer)
            .resize(Math.min(splash.width * 0.4, splash.height * 0.4))
            .png()
            .toBuffer(),
          gravity: 'center'
        }
      ])
      .png({ quality: 90 })
      .toFile(outputPath)
      
      console.log(`✅ 생성완료: ${splash.name}`)
    }

    console.log('🎉 모든 PWA 아이콘 생성 완료!')
    console.log('📁 생성된 파일들:')
    
    // 생성된 파일 목록 출력
    const files = fs.readdirSync(publicDir).filter(file => 
      file.startsWith('icon-') || 
      file.startsWith('splash-') || 
      file.includes('favicon')
    )
    
    files.forEach(file => {
      const filePath = path.join(publicDir, file)
      const stats = fs.statSync(filePath)
      console.log(`   ${file} (${Math.round(stats.size / 1024)}KB)`)
    })

  } catch (error) {
    console.error('❌ 아이콘 생성 실패:', error)
    process.exit(1)
  }
}

// package.json에 스크립트가 없는 경우를 위한 직접 실행
if (require.main === module) {
  generateIcons()
}

module.exports = { generateIcons }