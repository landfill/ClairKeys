const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    console.log('=== Checking Users table ===')
    const users = await prisma.user.findMany()
    console.log('Users found:', users.length)
    users.forEach(user => {
      console.log(`- ID: ${user.id} | Email: ${user.email} | Name: ${user.name}`)
    })

    console.log('\n=== Checking specific user ===')
    const targetUserId = '109604961179173007370'
    const specificUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    })
    
    if (specificUser) {
      console.log('Found specific user:', specificUser)
    } else {
      console.log('Specific user NOT found with ID:', targetUserId)
      
      // Try to find by email
      const userByEmail = await prisma.user.findUnique({
        where: { email: 'letthelightsurroundyou@gmail.com' }
      })
      
      if (userByEmail) {
        console.log('But found user by email:', userByEmail)
      }
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()