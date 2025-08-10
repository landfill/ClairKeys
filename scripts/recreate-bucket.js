/**
 * Delete and recreate animation-data bucket as public
 * Run with: tsx scripts/recreate-bucket.js
 */

// Load environment variables
require('dotenv').config()

const { supabaseServer } = require('../src/lib/supabase/server')

async function recreateBucket() {
  console.log('🔧 Recreating animation-data bucket as public...\n')
  
  try {
    // First, check if bucket exists
    const { data: buckets, error: listError } = await supabaseServer.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Failed to list buckets:', listError.message)
      return
    }

    const animationBucket = buckets.find(b => b.name === 'animation-data')
    
    if (animationBucket) {
      console.log('🗑️ Deleting existing animation-data bucket...')
      
      // Delete the bucket
      const { error: deleteError } = await supabaseServer.storage.deleteBucket('animation-data')
      
      if (deleteError) {
        console.error('❌ Failed to delete bucket:', deleteError.message)
        return
      }
      
      console.log('✅ Deleted animation-data bucket')
    }
    
    console.log('📦 Creating new animation-data bucket as public...')
    
    // Create the new bucket as public
    const { error: createError } = await supabaseServer.storage.createBucket('animation-data', {
      public: true,
      allowedMimeTypes: ['application/json'],
      fileSizeLimit: 10 * 1024 * 1024 // 10MB
    })
    
    if (createError) {
      console.error('❌ Failed to create bucket:', createError.message)
      return
    }
    
    console.log('✅ Created animation-data bucket as public')
    
    // Verify the new configuration
    console.log('\\n🔍 Verifying new bucket configuration...')
    const { data: newBuckets } = await supabaseServer.storage.listBuckets()
    
    console.log('📦 Updated buckets:')
    newBuckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`)
    })
    
    console.log('\\n✅ Bucket recreation completed!')
    console.log('💡 Next step: Regenerate animation data files')
    
  } catch (error) {
    console.error('❌ Recreation failed:', error.message)
  }
}

if (require.main === module) {
  recreateBucket()
}