#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connection successful!')
    
    // Test query
    const userCount = await prisma.user.count()
    console.log(`📊 Found ${userCount} users in database`)
    
    // Test all tables
    console.log('\n📋 Table status:')
    try {
      const userCount = await prisma.user.count()
      console.log(`  ✅ users: ${userCount} records`)
    } catch (error: any) {
      console.log(`  ❌ users: Error - ${error.message}`)
    }
    
    try {
      const categoryCount = await prisma.category.count()
      console.log(`  ✅ categories: ${categoryCount} records`)
    } catch (error: any) {
      console.log(`  ❌ categories: Error - ${error.message}`)
    }
    
    try {
      const sheetMusicCount = await prisma.sheetMusic.count()
      console.log(`  ✅ sheetMusic: ${sheetMusicCount} records`)
    } catch (error: any) {
      console.log(`  ❌ sheetMusic: Error - ${error.message}`)
    }
    
    try {
      const practiceSessionCount = await prisma.practiceSession.count()
      console.log(`  ✅ practiceSessions: ${practiceSessionCount} records`)
    } catch (error: any) {
      console.log(`  ❌ practiceSessions: Error - ${error.message}`)
    }
    
    console.log('\n🎉 Database test completed successfully!')
    
  } catch (error: any) {
    console.error('❌ Database connection failed:')
    console.error(error.message)
    
    if (error.code === 'P1001') {
      console.log('\n💡 Troubleshooting tips:')
      console.log('  1. Check your DATABASE_URL in .env file')
      console.log('  2. Ensure your Supabase project is active')
      console.log('  3. Verify your database credentials')
      console.log('  4. Run: npm run db:migrate')
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()