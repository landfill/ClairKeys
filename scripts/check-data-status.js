/**
 * Check current data status and identify migration needs
 * Run with: node scripts/check-data-status.js
 */
// Load environment variables
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDataStatus() {
  console.log('🔍 Checking current data status...\n')
  
  try {
    // Check total sheet music count
    const totalCount = await prisma.sheetMusic.count()
    console.log(`📊 Total sheet music records: ${totalCount}`)
    
    if (totalCount === 0) {
      console.log('✨ No data found - database appears to be empty')
      console.log('   Run: npm run seed')
      return
    }
    
    // Check for problematic data
    const problematicData = await prisma.sheetMusic.findMany({
      where: {
        animationDataUrl: {
          startsWith: '/sample-data/'
        }
      },
      select: {
        id: true,
        title: true,
        composer: true,
        animationDataUrl: true,
        createdAt: true
      }
    })
    
    console.log(`❌ Records with file path URLs: ${problematicData.length}`)
    if (problematicData.length > 0) {
      problematicData.forEach(record => {
        console.log(`   - ID ${record.id}: "${record.title}" by ${record.composer}`)
        console.log(`     URL: ${record.animationDataUrl}`)
      })
    }
    
    // Check for proper Supabase URLs
    const properData = await prisma.sheetMusic.findMany({
      where: {
        animationDataUrl: {
          contains: 'supabase'
        }
      },
      select: {
        id: true,
        title: true,
        composer: true,
        animationDataUrl: true
      }
    })
    
    console.log(`\n✅ Records with proper Supabase URLs: ${properData.length}`)
    if (properData.length > 0) {
      properData.forEach(record => {
        console.log(`   - ID ${record.id}: "${record.title}" by ${record.composer}`)
      })
    }
    
    // Check for other URL patterns
    const otherData = await prisma.sheetMusic.findMany({
      where: {
        AND: [
          {
            animationDataUrl: {
              not: {
                startsWith: '/sample-data/'
              }
            }
          },
          {
            animationDataUrl: {
              not: {
                contains: 'supabase'
              }
            }
          }
        ]
      },
      select: {
        id: true,
        title: true,
        animationDataUrl: true
      }
    })
    
    if (otherData.length > 0) {
      console.log(`\n🔍 Records with other URL patterns: ${otherData.length}`)
      otherData.forEach(record => {
        console.log(`   - ID ${record.id}: "${record.title}"`)
        console.log(`     URL: ${record.animationDataUrl}`)
      })
    }
    
    console.log('\n' + '='.repeat(60))
    
    if (problematicData.length > 0) {
      console.log('🚨 Migration needed!')
      console.log('\nRecommended actions:')
      console.log('1. Configure Supabase Storage (see SUPABASE_STORAGE_SETUP.md)')
      console.log('2. Run: npm run migrate-storage-data')
      console.log('3. Run: npm run seed (to recreate data with proper URLs)')
    } else {
      console.log('✅ Data looks good - no migration needed')
    }
    
  } catch (error) {
    console.error('❌ Error checking data status:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  checkDataStatus()
}