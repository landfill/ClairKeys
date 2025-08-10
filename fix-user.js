const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createUser() {
  try {
    // Current user details from the logs
    const userId = '109604961179173007370'
    const userEmail = 'letthelightsurroundyou@gmail.com'
    const userName = 'BYOUNG KWANG KIM'
    const userImage = 'https://lh3.googleusercontent.com/a/ACg8ocJh_W5KekvkRoxfcYjRBwxcNuh90QV4wzN_eJjiic-IHis8V07m=s96-c'

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (existingUser) {
      console.log('User already exists:', existingUser)
      return
    }

    // Create the user
    const user = await prisma.user.create({
      data: {
        id: userId,
        name: userName,
        email: userEmail,
        image: userImage,
        emailVerified: new Date(),
      }
    })

    console.log('Created user:', user)

    // Also create an account record
    const account = await prisma.account.create({
      data: {
        userId: userId,
        type: 'oauth',
        provider: 'google',
        providerAccountId: userId,
        access_token: 'placeholder',
        token_type: 'Bearer',
        scope: 'openid email profile',
      }
    })

    console.log('Created account:', account)

  } catch (error) {
    console.error('Error creating user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createUser()