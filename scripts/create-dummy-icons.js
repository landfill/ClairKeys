/**
 * 더미 PWA 아이콘 생성 스크립트
 * 실제 아이콘이 없을 때 임시로 사용할 단색 아이콘들을 생성
 */

const fs = require('fs')
const path = require('path')

// SVG 기반 더미 아이콘 생성
const createDummyIcon = (size, color = '#2563eb') => {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="${color}" rx="${size * 0.1}"/>
    <text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="white" font-family="Arial, sans-serif" font-size="${size * 0.3}" font-weight="bold">CK</text>
  </svg>`
}

// SVG를 간단한 HTML로 변환하여 PNG처럼 사용
const createIconFile = async (size, filename) => {
  const publicDir = path.join(__dirname, '..', 'public')
  
  // public 폴더가 없으면 생성
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  const svg = createDummyIcon(size)
  const svgPath = path.join(publicDir, filename.replace('.png', '.svg'))
  
  try {
    fs.writeFileSync(svgPath, svg)
    
    // PNG 버전을 위해 동일한 내용으로 복사 (브라우저가 SVG를 렌더링)
    const htmlIcon = `<!DOCTYPE html>
<html><head><style>body{margin:0;padding:0;}</style></head>
<body>${svg}</body></html>`
    
    // HTML 파일로 생성 (임시방편)
    const htmlPath = path.join(publicDir, filename.replace('.png', '.html'))
    fs.writeFileSync(htmlPath, htmlIcon)
    
    console.log(`✅ 생성완료: ${filename} (SVG + HTML)`)
  } catch (error) {
    console.error(`❌ 생성실패: ${filename}`, error)
  }
}

// 실제 파일들 생성
async function generateDummyIcons() {
  console.log('🎹 ClairKeys 더미 PWA 아이콘 생성 시작...')
  
  const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512]
  
  for (const size of iconSizes) {
    await createIconFile(size, `icon-${size}.png`)
  }
  
  // 파비콘
  await createIconFile(32, 'favicon.png')
  
  console.log('🎉 더미 PWA 아이콘 생성 완료!')
  console.log('📝 참고: 실제 운영 환경에서는 proper 디자인 아이콘으로 교체하세요.')
}

// 직접 실행
if (require.main === module) {
  generateDummyIcons()
}

module.exports = { generateDummyIcons }