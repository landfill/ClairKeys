/**
 * Test the animation URLs directly
 * Run with: tsx scripts/test-animation-urls.js
 */

// Load environment variables
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAnimationUrls() {
  console.log('🧪 Testing Animation URLs directly...\n')
  
  try {
    // Get all sheet music records with URLs
    const records = await prisma.sheetMusic.findMany({
      select: {
        id: true,
        title: true,
        composer: true,
        isPublic: true,
        animationDataUrl: true
      }
    })
    
    console.log(`📊 Found ${records.length} records to test\n`)
    
    for (const record of records) {
      console.log(`🎵 Testing: "${record.title}" by ${record.composer}`)
      console.log(`   ID: ${record.id}`)
      console.log(`   Public: ${record.isPublic}`)
      console.log(`   URL: ${record.animationDataUrl}`)
      
      try {
        console.log(`🔗 Fetching URL...`)
        const response = await fetch(record.animationDataUrl)
        
        console.log(`📡 Response status: ${response.status}`)
        console.log(`📡 Response headers:`)
        console.log(`   Content-Type: ${response.headers.get('content-type')}`)
        console.log(`   Content-Length: ${response.headers.get('content-length')}`)
        
        if (response.ok) {
          const content = await response.text()
          console.log(`📄 Content length: ${content.length} characters`)
          console.log(`📄 Content preview (first 200 chars):`)
          console.log(`   ${content.substring(0, 200)}`)
          
          // Try to parse as JSON
          try {
            const jsonData = JSON.parse(content)
            console.log(`✅ JSON is valid! Keys: ${Object.keys(jsonData).join(', ')}`)
            
            // Check for expected PianoAnimationData structure
            if (jsonData.duration && jsonData.events) {
              console.log(`✅ Has expected structure: duration=${jsonData.duration}, events=${jsonData.events.length}`)
            } else {
              console.log(`❓ Missing expected fields (duration, events)`)
            }
          } catch (jsonError) {
            console.log(`❌ Invalid JSON: ${jsonError.message}`)
            console.log(`❌ First 100 chars of invalid content: ${content.substring(0, 100)}`)
          }
        } else {
          console.log(`❌ Failed to fetch: ${response.status} ${response.statusText}`)
          const errorBody = await response.text()
          console.log(`❌ Error body: ${errorBody}`)
        }
      } catch (fetchError) {
        console.log(`❌ Fetch error: ${fetchError.message}`)
      }
      
      console.log('')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  testAnimationUrls()
}