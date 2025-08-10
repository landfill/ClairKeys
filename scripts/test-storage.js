/**
 * Test Supabase Storage functionality
 * Run with: node scripts/test-storage.js
 */
// Load environment variables
require('dotenv').config()

const { createClient } = require('@supabase/supabase-js')

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables for server')
}

const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testStorage() {
  console.log('🧪 Testing Supabase Storage functionality...\n')
  
  try {
    // Test 1: Connection
    console.log('1. Testing connection...')
    const { data: buckets, error } = await supabaseServer.storage.listBuckets()
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      return false
    }
    
    console.log('✅ Connection successful')
    console.log(`   Found ${buckets.length} buckets: ${buckets.map(b => b.name).join(', ')}`)
    
    // Test 2: Upload test file
    console.log('\n2. Testing file upload...')
    const testData = {
      version: '1.0',
      title: 'Storage Test',
      composer: 'Test Runner',
      duration: 5.0,
      tempo: 120,
      timeSignature: '4/4',
      notes: [
        { note: 'C4', startTime: 0, duration: 1, velocity: 0.8 },
        { note: 'E4', startTime: 1, duration: 1, velocity: 0.8 },
        { note: 'G4', startTime: 2, duration: 1, velocity: 0.8 }
      ],
      metadata: {
        originalFileName: 'test.json',
        fileSize: 500,
        processedAt: new Date().toISOString(),
        extractedText: 'Storage test data',
        pagesProcessed: 1,
        staffLinesDetected: 5,
        notesDetected: 3
      }
    }
    
    // Direct upload test using Supabase client
    const fileName = `test_${Date.now()}.json`
    const filePath = `test-user/${fileName}`
    const jsonData = JSON.stringify(testData, null, 2)
    const buffer = Buffer.from(jsonData, 'utf-8')

    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from('animation-data')
      .upload(filePath, buffer, {
        contentType: 'application/json',
        cacheControl: '3600',
        upsert: false
      })

    const uploadResult = {
      success: !uploadError,
      error: uploadError?.message,
      path: filePath,
      url: uploadError ? null : supabaseServer.storage
        .from('animation-data')
        .getPublicUrl(filePath).data.publicUrl
    }
    
    if (!uploadResult.success) {
      console.error('❌ Upload failed:', uploadResult.error)
      return false
    }
    
    console.log('✅ Upload successful')
    console.log(`   URL: ${uploadResult.url}`)
    console.log(`   Path: ${uploadResult.path}`)
    
    // Test 3: Download/verify uploaded file
    console.log('\n3. Testing file download...')
    try {
      const response = await fetch(uploadResult.url)
      const downloadedData = await response.json()
      
      if (downloadedData.title === testData.title) {
        console.log('✅ Download and verification successful')
        console.log(`   Downloaded file matches uploaded data`)
      } else {
        console.error('❌ Downloaded data does not match uploaded data')
        return false
      }
    } catch (error) {
      console.error('❌ Download failed:', error.message)
      return false
    }
    
    // Test 4: Clean up test file
    console.log('\n4. Cleaning up test file...')
    const { error: deleteError } = await supabaseServer.storage
      .from('animation-data')
      .remove([uploadResult.path])
    
    if (!deleteError) {
      console.log('✅ Cleanup successful')
    } else {
      console.log('⚠️ Cleanup failed (file may remain in storage):', deleteError.message)
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('🎉 All storage tests passed!')
    console.log('\nYour Supabase Storage is properly configured and ready to use.')
    
    return true
    
  } catch (error) {
    console.error('❌ Storage test failed:', error.message)
    return false
  }
}

if (require.main === module) {
  testStorage()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
}