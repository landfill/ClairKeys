const { fileStorageService } = require('./src/services/fileStorageService')

async function testStorageService() {
  try {
    console.log('Testing fileStorageService...')
    
    const testData = {
      title: "Test Song",
      composer: "Test Composer", 
      notes: [
        { midi: 60, start: 0, duration: 1 },
        { midi: 64, start: 1, duration: 1 }
      ]
    }

    const result = await fileStorageService.uploadAnimationData(testData, {
      name: 'test_animation.json',
      size: JSON.stringify(testData).length,
      type: 'application/json',
      userId: 'test-user-123',
      isPublic: true
    })

    console.log('Upload result:', result)

    if (result.success) {
      console.log('✅ Storage service working correctly!')
      console.log('URL:', result.url)
    } else {
      console.log('❌ Storage service failed:', result.error)
    }

  } catch (error) {
    console.error('Test failed:', error)
  }
}

testStorageService()