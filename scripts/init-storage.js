/**
 * Initialize Supabase Storage buckets
 * Run with: node scripts/init-storage.js
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

// Define buckets
const buckets = [
  { name: 'animation-data', public: true },
  { name: 'sheet-music-files', public: true },
  { name: 'temp-uploads', public: false }
]

async function initializeStorage() {
  console.log('🚀 Initializing Supabase Storage...')
  
  try {
    // Test connection first
    const { data, error } = await supabaseServer.storage.listBuckets()
    
    if (error) {
      console.error('❌ Failed to connect to Supabase Storage:', error.message)
      console.log('\n🔧 Please check your environment variables:')
      console.log('   - NEXT_PUBLIC_SUPABASE_URL')
      console.log('   - SUPABASE_SERVICE_ROLE_KEY')
      process.exit(1)
    }

    console.log('✅ Connected to Supabase Storage')
    
    // Initialize buckets
    let allSuccess = true
    
    for (const bucket of buckets) {
      console.log(`📦 Creating bucket: ${bucket.name}`)
      
      const { error: bucketError } = await supabaseServer.storage.createBucket(bucket.name, {
        public: bucket.public,
        allowedMimeTypes: bucket.name === 'animation-data' ? 
          ['application/json'] : 
          ['application/pdf', 'image/png', 'image/jpeg'],
        fileSizeLimit: bucket.name === 'temp-uploads' ? 
          50 * 1024 * 1024 : // 50MB for temp files
          10 * 1024 * 1024   // 10MB for others
      })

      if (bucketError && !bucketError.message.includes('already exists')) {
        console.error(`❌ Failed to create bucket ${bucket.name}:`, bucketError)
        allSuccess = false
      } else if (bucketError && bucketError.message.includes('already exists')) {
        console.log(`✅ Bucket ${bucket.name} already exists`)
      } else {
        console.log(`✅ Bucket ${bucket.name} created successfully`)
      }
    }
    
    if (allSuccess) {
      console.log('\n✅ All storage buckets initialized successfully')
      
      // List created buckets
      const { data: bucketList } = await supabaseServer.storage.listBuckets()
      console.log('\n📦 Available buckets:')
      bucketList?.forEach(bucket => {
        console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`)
      })
      
    } else {
      console.error('❌ Failed to initialize some buckets')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Storage initialization failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  initializeStorage()
}