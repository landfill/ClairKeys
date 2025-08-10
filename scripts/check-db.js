const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkSheetMusic() {
  try {
    const sheets = await prisma.sheetMusic.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        composer: true,
        animationDataUrl: true,
        createdAt: true
      }
    });
    
    console.log('최근 악보 5개:');
    sheets.forEach(sheet => {
      console.log('ID:', sheet.id);
      console.log('제목:', sheet.title);
      console.log('작곡가:', sheet.composer);
      console.log('animationDataUrl 길이:', sheet.animationDataUrl ? sheet.animationDataUrl.length : 'null');
      if (sheet.animationDataUrl) {
        const isUrl = sheet.animationDataUrl.startsWith('http');
        console.log('URL 여부:', isUrl);
        if (!isUrl) {
          console.log('JSON 데이터 미리보기:', sheet.animationDataUrl.substring(0, 200) + '...');
        } else {
          console.log('URL:', sheet.animationDataUrl);
        }
      }
      console.log('생성일:', sheet.createdAt);
      console.log('---');
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSheetMusic();