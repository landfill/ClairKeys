/**
 * Debug database records in detail
 * Run with: tsx scripts/debug-database.js
 */

// Load environment variables
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugDatabase() {
  console.log('🔍 Debugging database records in detail...\n')
  
  try {
    // Get all sheet music records with full details
    const records = await prisma.sheetMusic.findMany({
      select: {
        id: true,
        title: true,
        composer: true,
        category: true,
        isPublic: true,
        animationDataUrl: true,
        userId: true,
        createdAt: true
      }
    })
    
    console.log(`📊 Total records: ${records.length}\n`)
    
    for (const record of records) {
      console.log('🎵 Record Details:')
      console.log(`   ID: ${record.id}`)
      console.log(`   Title: "${record.title}"`)
      console.log(`   Composer: ${record.composer}`)
      console.log(`   Category: ${record.category || 'None'}`)
      console.log(`   Public: ${record.isPublic}`)
      console.log(`   User ID: ${record.userId}`)
      console.log(`   Created: ${record.createdAt}`)
      console.log(`   Animation URL: ${record.animationDataUrl}`)
      console.log(`   URL Length: ${record.animationDataUrl?.length || 0} characters`)
      
      // Check URL format
      if (record.animationDataUrl) {
        if (record.animationDataUrl.startsWith('http')) {
          console.log(`   ✅ URL format looks correct`)
          
          // Try to parse as URL
          try {
            const url = new URL(record.animationDataUrl)
            console.log(`   🌐 Host: ${url.host}`)
            console.log(`   📁 Path: ${url.pathname}`)
          } catch (error) {
            console.log(`   ❌ Invalid URL format: ${error.message}`)
          }
        } else if (record.animationDataUrl.startsWith('{') || record.animationDataUrl.startsWith('[')) {
          console.log(`   ❌ MALFORMED: Contains JSON data instead of URL`)
        } else {
          console.log(`   ❓ Unknown format: ${record.animationDataUrl.substring(0, 50)}...`)
        }
      } else {
        console.log(`   ❌ No animation data URL`)
      }
      console.log('')
    }
    
  } catch (error) {
    console.error('❌ Database query failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  debugDatabase()
}