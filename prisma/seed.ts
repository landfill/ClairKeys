import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create a demo user (this would normally be created through NextAuth)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@clairkeys.com' },
    update: {},
    create: {
      email: 'demo@clairkeys.com',
      name: 'Demo User',
      image: null,
    },
  })

  console.log('✅ Created demo user:', demoUser.email)

  // Create default categories
  const categories = [
    { name: '클래식', userId: demoUser.id },
    { name: '팝송', userId: demoUser.id },
    { name: '재즈', userId: demoUser.id },
    { name: 'K-POP', userId: demoUser.id },
    { name: '영화음악', userId: demoUser.id },
  ]

  for (const category of categories) {
    const existing = await prisma.category.findFirst({
      where: {
        name: category.name,
        userId: category.userId,
      },
    })

    if (!existing) {
      await prisma.category.create({
        data: category,
      })
    }
  }

  console.log('✅ Created default categories')

  // Create sample sheet music entries
  const classicCategory = await prisma.category.findFirst({
    where: { name: '클래식', userId: demoUser.id },
  })

  if (classicCategory) {
    const sampleSheetMusic = [
      {
        title: 'Canon in D',
        composer: 'Johann Pachelbel',
        userId: demoUser.id,
        categoryId: classicCategory.id,
        isPublic: true,
        animationDataUrl: '/sample-data/canon-in-d.json',
      },
      {
        title: 'Für Elise',
        composer: 'Ludwig van Beethoven',
        userId: demoUser.id,
        categoryId: classicCategory.id,
        isPublic: true,
        animationDataUrl: '/sample-data/fur-elise.json',
      },
    ]

    for (const sheetMusic of sampleSheetMusic) {
      const existing = await prisma.sheetMusic.findFirst({
        where: {
          title: sheetMusic.title,
          composer: sheetMusic.composer,
          userId: sheetMusic.userId,
        },
      })

      if (!existing) {
        await prisma.sheetMusic.create({
          data: sheetMusic,
        })
      }
    }

    console.log('✅ Created sample sheet music')
  }

  console.log('🎉 Database seed completed!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })