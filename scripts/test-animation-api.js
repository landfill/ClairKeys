/**
 * Test the animation API endpoint directly
 * Run with: tsx scripts/test-animation-api.js
 */

// Load environment variables
require('dotenv').config()

async function testAnimationApi() {
  console.log('🧪 Testing Animation API endpoint...\n')
  
  // Test with the known sheet music IDs
  const testIds = [11, 12]
  
  for (const id of testIds) {
    console.log(`\n🎵 Testing sheet music ID: ${id}`)
    console.log('=' + '='.repeat(50))
    
    try {
      // Test the API endpoint
      const response = await fetch(`http://localhost:3000/api/files/animation?sheetMusicId=${id}`, {
        method: 'GET',
        headers: {
          'Cookie': 'next-auth.session-token=test' // This won't work without proper auth, but let's see
        }
      })
      
      console.log(`📡 Response status: ${response.status}`)
      console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()))
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Success! Response data:`, data)
        
        if (data.url) {
          console.log(`🔗 Testing animation file URL: ${data.url}`)
          
          // Test fetching the actual file
          const fileResponse = await fetch(data.url)
          console.log(`📁 File response status: ${fileResponse.status}`)
          
          if (fileResponse.ok) {
            const fileContent = await fileResponse.text()
            console.log(`📄 File content length: ${fileContent.length}`)
            console.log(`📄 File content preview: ${fileContent.substring(0, 100)}...`)
          } else {
            console.log(`❌ Failed to fetch file: ${fileResponse.statusText}`)
          }
        }
      } else {
        const errorData = await response.text()
        console.log(`❌ API Error: ${errorData}`)
      }
    } catch (error) {
      console.error(`❌ Test failed:`, error.message)
    }
  }
}

if (require.main === module) {
  testAnimationApi().catch(console.error)
}