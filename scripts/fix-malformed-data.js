/**
 * Fix malformed data in database
 * Run with: tsx scripts/fix-malformed-data.js
 */
// Load environment variables
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixMalformedData() {
  console.log('🔧 Fixing malformed data in database...\n')
  
  try {
    // Find records with JSON data stored directly in animationDataUrl
    const malformedRecords = await prisma.sheetMusic.findMany({
      where: {
        animationDataUrl: {
          startsWith: '{'
        }
      },
      select: {
        id: true,
        title: true,
        composer: true,
        animationDataUrl: true
      }
    })
    
    console.log(`📊 Found ${malformedRecords.length} malformed records`)
    
    if (malformedRecords.length === 0) {
      console.log('✅ No malformed data found')
      return
    }
    
    for (const record of malformedRecords) {
      console.log(`\n🗑️ Processing: "${record.title}" by ${record.composer}`)
      console.log(`   ID: ${record.id}`)
      console.log(`   Issue: JSON data stored directly in URL field`)
      
      // Delete the malformed record
      await prisma.sheetMusic.delete({
        where: { id: record.id }
      })
      
      console.log(`   ✅ Deleted malformed record`)
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('🎉 Malformed data cleanup completed!')
    console.log('\nRecommendations:')
    console.log('1. Run: npm run seed (to create new clean data)')
    console.log('2. Test the application: npm run dev')
    
  } catch (error) {
    console.error('❌ Error fixing malformed data:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  fixMalformedData()
}