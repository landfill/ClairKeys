import { PrismaClient } from '@prisma/client'
import { fileStorageService } from '../src/services/fileStorageService'
import { PDFParserService, PianoAnimationData } from '../src/services/pdfParser'
import { convertMusicDataToPianoAnimation, validateMusicData } from '../src/services/musicDataConverter'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const pdfParser = new PDFParserService()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create a demo user (this would normally be created through NextAuth)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@clairkeys.com' },
    update: {},
    create: {
      email: 'demo@clairkeys.com',
      name: 'Demo User',
      image: null,
    },
  })

  console.log('✅ Created demo user:', demoUser.email)

  // Create default categories
  const categories = [
    { name: '클래식', userId: demoUser.id },
    { name: '팝송', userId: demoUser.id },
    { name: '재즈', userId: demoUser.id },
    { name: 'K-POP', userId: demoUser.id },
    { name: '영화음악', userId: demoUser.id },
  ]

  for (const category of categories) {
    const existing = await prisma.category.findFirst({
      where: {
        name: category.name,
        userId: category.userId,
      },
    })

    if (!existing) {
      await prisma.category.create({
        data: category,
      })
    }
  }

  console.log('✅ Created default categories')

  // Create sample sheet music entries with real animation data
  const classicCategory = await prisma.category.findFirst({
    where: { name: '클래식', userId: demoUser.id },
  })

  if (classicCategory) {
    const sampleSheetMusic = [
      {
        title: 'Canon in D',
        composer: 'Johann Pachelbel',
        userId: demoUser.id,
        categoryId: classicCategory.id,
        isPublic: true,
      },
      {
        title: 'Für Elise',
        composer: 'Ludwig van Beethoven',
        userId: demoUser.id,
        categoryId: classicCategory.id,
        isPublic: true,
      },
    ]

    for (const sheetMusic of sampleSheetMusic) {
      const existing = await prisma.sheetMusic.findFirst({
        where: {
          title: sheetMusic.title,
          composer: sheetMusic.composer,
          userId: sheetMusic.userId,
        },
      })

      if (!existing) {
        // Try to load real animation data from sample-data folder first
        const sampleFileName = `${sheetMusic.title.toLowerCase().replace(/\s+/g, '-')}.json`
        const sampleFilePath = path.join(process.cwd(), 'sample-data', sampleFileName)
        
        let animationData: PianoAnimationData
        
        if (fs.existsSync(sampleFilePath)) {
          // Load real sample data
          console.log(`📁 Loading sample data from: ${sampleFileName}`)
          try {
            const fileContent = fs.readFileSync(sampleFilePath, 'utf8')
            const musicData = JSON.parse(fileContent)
            
            // Validate the new JSON format
            if (validateMusicData(musicData)) {
              // Convert to PianoAnimationData format
              animationData = convertMusicDataToPianoAnimation(musicData, sampleFileName)
              console.log(`✅ Converted and loaded real animation data for "${sheetMusic.title}"`)
              console.log(`   📊 Notes: ${musicData.metadata.totalNotes} (L: ${musicData.metadata.leftHandNotes}, R: ${musicData.metadata.rightHandNotes})`)
            } else {
              console.warn(`⚠️  Invalid JSON format in ${sampleFileName}, using fallback`)
              throw new Error('Invalid JSON format')
            }
          } catch (error) {
            console.error(`❌ Failed to load sample data from ${sampleFileName}:`, error)
            // Fall through to generate demo data
          }
        }
        
        if (!animationData) {
          // Fallback to generated demo data
          console.log(`🔄 Generating demo data for "${sheetMusic.title}" (no sample file found)`)
          const demoBuffer = Buffer.from('Demo PDF content')
          animationData = await pdfParser.parsePDF(demoBuffer, {
            title: sheetMusic.title,
            composer: sheetMusic.composer,
            originalFileName: `${sheetMusic.title.toLowerCase().replace(/\s+/g, '-')}.pdf`
          })
        }

        // Upload animation data to Supabase Storage
        console.log(`📤 Uploading animation data for "${sheetMusic.title}"...`)
        const uploadResult = await fileStorageService.uploadAnimationData(
          animationData,
          {
            name: `${sheetMusic.title}_animation.json`,
            size: JSON.stringify(animationData).length,
            type: 'application/json',
            userId: demoUser.id,
            isPublic: sheetMusic.isPublic
          }
        )

        if (uploadResult.success) {
          // Create sheet music entry with uploaded animation data URL
          await prisma.sheetMusic.create({
            data: {
              ...sheetMusic,
              animationDataUrl: uploadResult.url
            }
          })
          console.log(`✅ Created "${sheetMusic.title}" with animation data`)
        } else {
          console.error(`❌ Failed to upload animation data for "${sheetMusic.title}":`, uploadResult.error)
          // Create with fallback URL for now
          await prisma.sheetMusic.create({
            data: {
              ...sheetMusic,
              animationDataUrl: `/sample-data/${sheetMusic.title.toLowerCase().replace(/\s+/g, '-')}.json`
            }
          })
        }
      }
    }

    console.log('✅ Created sample sheet music with animation data')
  }

  console.log('🎉 Database seed completed!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })