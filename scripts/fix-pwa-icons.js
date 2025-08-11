/**
 * PWA 아이콘 404 오류 수정 스크립트
 * Canvas API를 사용하여 실제 PNG 파일들을 생성
 */

const fs = require('fs')
const path = require('path')
const { createCanvas } = require('canvas')

// 필요한 아이콘 크기들
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512]

/**
 * ClairKeys 로고를 Canvas로 그리기
 */
function drawClairKeysLogo(ctx, size) {
  const centerX = size / 2
  const centerY = size / 2
  const radius = size * 0.45
  
  // 배경 원형 그라디언트
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#2563eb')
  gradient.addColorStop(1, '#1d4ed8')
  
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
  ctx.fill()
  
  // 테두리
  ctx.strokeStyle = '#1e40af'
  ctx.lineWidth = size * 0.008
  ctx.stroke()
  
  // ClairKeys 텍스트
  ctx.fillStyle = 'white'
  ctx.font = `bold ${size * 0.12}px Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('CK', centerX, centerY)
}

/**
 * PNG 아이콘 파일 생성
 */
async function createPngIcon(size, filename) {
  const publicDir = path.join(__dirname, '..', 'public')
  
  // public 폴더가 없으면 생성
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  try {
    // Canvas 생성
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext('2d')
    
    // 투명 배경
    ctx.clearRect(0, 0, size, size)
    
    // 로고 그리기
    drawClairKeysLogo(ctx, size)
    
    // PNG 버퍼 생성
    const buffer = canvas.toBuffer('image/png')
    
    // 파일 저장
    const outputPath = path.join(publicDir, filename)
    fs.writeFileSync(outputPath, buffer)
    
    console.log(`✅ 생성완료: ${filename} (${Math.round(buffer.length / 1024)}KB)`)
  } catch (error) {
    console.error(`❌ 생성실패: ${filename}`, error)
  }
}

/**
 * 모든 PWA 아이콘 생성
 */
async function fixPwaIcons() {
  console.log('🎹 ClairKeys PWA 아이콘 수정 시작...')
  console.log('📝 Canvas API를 사용하여 실제 PNG 파일들을 생성합니다.')
  
  for (const size of iconSizes) {
    await createPngIcon(size, `icon-${size}.png`)
  }
  
  // 파비콘도 생성
  await createPngIcon(32, 'favicon.png')
  
  console.log('🎉 모든 PWA 아이콘 생성 완료!')
  console.log('✅ 이제 manifest.json의 모든 아이콘들이 정상적으로 로드됩니다.')
}

// 직접 실행
if (require.main === module) {
  fixPwaIcons()
}

module.exports = { fixPwaIcons }