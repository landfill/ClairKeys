/**
 * Update bucket configuration to make animation-data public
 * Run with: tsx scripts/update-bucket-config.js
 */

// Load environment variables
require('dotenv').config()

const { supabaseServer } = require('../src/lib/supabase/server')

async function updateBucketConfig() {
  console.log('🔧 Updating bucket configuration...\n')
  
  try {
    // First, check current bucket configuration
    const { data: buckets, error: listError } = await supabaseServer.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Failed to list buckets:', listError.message)
      return
    }

    console.log('📦 Current buckets:')
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`)
    })

    // Find the animation-data bucket
    const animationBucket = buckets.find(b => b.name === 'animation-data')
    
    if (!animationBucket) {
      console.log('\n❌ animation-data bucket not found. Creating it...')
      
      // Create the bucket as public
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
    } else if (!animationBucket.public) {
      console.log('\\n⚠️ animation-data bucket is currently private')
      console.log('🔄 Attempting to update bucket to public...')
      
      // Unfortunately, Supabase doesn't support updating bucket privacy after creation
      // We would need to delete and recreate, but that would lose data
      console.log('\\n⚠️ WARNING: Cannot change bucket privacy after creation')
      console.log('📝 Solution: The bucket needs to be deleted and recreated')
      console.log('   But this would lose existing files!')
      console.log('\\n💡 Alternative: Update API to use signed URLs for private files')
      
    } else {
      console.log('\\n✅ animation-data bucket is already public')
    }
    
  } catch (error) {
    console.error('❌ Update failed:', error.message)
  }
}

if (require.main === module) {
  updateBucketConfig()
}