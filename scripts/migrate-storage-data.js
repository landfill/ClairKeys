/**
 * Migrate existing data to use proper Supabase Storage
 * Run with: node scripts/migrate-storage-data.js
 */
// Load environment variables
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const { fileStorageService } = require('../src/services/fileStorageService')
const { supabaseServer } = require('../src/lib/supabase/server')

const prisma = new PrismaClient()

async function migrateStorageData() {
  console.log('🚀 Starting storage data migration...\n')
  
  try {
    // First, check Supabase Storage connection
    console.log('1. Testing Supabase Storage connection...')
    const { data, error } = await supabaseServer.storage.listBuckets()
    
    if (error) {
      console.error('❌ Cannot connect to Supabase Storage:', error.message)
      console.log('\n🔧 Please configure Supabase Storage first:')
      console.log('   1. Update .env with real Supabase credentials')
      console.log('   2. Run: npm run init-storage')
      process.exit(1)
    }
    
    console.log('✅ Supabase Storage connection successful')
    
    // Check if required buckets exist
    const bucketNames = data.map(b => b.name)
    const requiredBuckets = ['animation-data', 'sheet-music-files', 'temp-uploads']
    const missingBuckets = requiredBuckets.filter(name => !bucketNames.includes(name))
    
    if (missingBuckets.length > 0) {
      console.log(`\n🔧 Missing buckets: ${missingBuckets.join(', ')}`)
      console.log('Creating missing buckets...')
      
      const success = await fileStorageService.initializeBuckets()
      if (!success) {
        console.error('❌ Failed to create required buckets')
        process.exit(1)
      }
    }
    
    // Find problematic data
    console.log('\n2. Finding records that need migration...')
    const problematicRecords = await prisma.sheetMusic.findMany({
      where: {
        animationDataUrl: {
          startsWith: '/sample-data/'
        }
      },
      include: {
        user: true
      }
    })
    
    console.log(`📊 Found ${problematicRecords.length} records to migrate`)
    
    if (problematicRecords.length === 0) {
      console.log('✅ No migration needed - all data looks good')
      return
    }
    
    // Migrate each record
    console.log('\n3. Migrating records...')
    let successCount = 0
    let failCount = 0
    
    for (const record of problematicRecords) {
      console.log(`\n📝 Processing: "${record.title}" by ${record.composer}`)
      console.log(`   Current URL: ${record.animationDataUrl}`)
      
      try {
        // Delete the existing record (we'll recreate it properly)
        await prisma.sheetMusic.delete({
          where: { id: record.id }
        })
        
        console.log('   ✅ Deleted old record - will be recreated by seed script')
        successCount++
        
      } catch (error) {
        console.error(`   ❌ Failed to process record:`, error.message)
        failCount++
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('📊 Migration Summary:')
    console.log(`   ✅ Successfully processed: ${successCount}`)
    console.log(`   ❌ Failed: ${failCount}`)
    
    if (successCount > 0) {
      console.log('\n🎯 Next steps:')
      console.log('   1. Run: npm run seed')
      console.log('   2. This will recreate records with proper Supabase Storage URLs')
      console.log('   3. Test the application: npm run dev')
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  migrateStorageData()
}