import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'
import { getPDFParserService } from '@/services/pdfParser'

export async function POST(request: NextRequest) {
  try {
    console.log('Upload API called')
    
    // Check authentication
    const session = await getServerSession(authOptions)
    console.log('Session:', session?.user?.id)
    
    if (!session?.user?.id) {
      console.log('No session found')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const composer = formData.get('composer') as string
    const categoryIdStr = formData.get('category') as string
    const isPublic = formData.get('isPublic') === 'true'

    // Parse category ID
    let categoryId: number | null = null
    if (categoryIdStr && categoryIdStr.trim()) {
      const parsedCategoryId = parseInt(categoryIdStr.trim())
      if (!isNaN(parsedCategoryId)) {
        // Verify that the category exists and belongs to the user
        const category = await prisma.category.findFirst({
          where: {
            id: parsedCategoryId,
            userId: session.user.id,
          },
        })
        if (category) {
          categoryId = parsedCategoryId
        }
      }
    }

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!composer?.trim()) {
      return NextResponse.json(
        { error: 'Composer is required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Read file content
    const fileBuffer = await file.arrayBuffer()
    const fileContent = Buffer.from(fileBuffer)

    // Process PDF and extract sheet music data
    console.log('Starting PDF processing...')
    console.log('File buffer size:', fileContent.length)
    
    const pdfParser = getPDFParserService()
    console.log('PDF parser service obtained')
    
    let animationData
    try {
      console.log('Calling parsePDF with metadata:', {
        title: title.trim(),
        composer: composer.trim(),
        originalFileName: file.name,
        fileSize: file.size
      })
      
      animationData = await pdfParser.parsePDF(fileContent, {
        title: title.trim(),
        composer: composer.trim(),
        originalFileName: file.name,
        fileSize: file.size
      })
      
      console.log('PDF parsing completed successfully')
    } catch (error) {
      console.error('PDF parsing error details:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      return NextResponse.json(
        { error: 'PDF 파싱 중 오류가 발생했습니다. 올바른 악보 PDF인지 확인해주세요.' },
        { status: 400 }
      )
    }

    // Validate the parsed data
    console.log('Validating animation data...')
    if (!pdfParser.validateAnimationData(animationData)) {
      console.error('Animation data validation failed')
      return NextResponse.json(
        { error: '악보 데이터 변환에 실패했습니다.' },
        { status: 400 }
      )
    }
    console.log('Animation data validation passed')

    // Save to database
    console.log('Saving to database with data:', {
      title: title.trim(),
      composer: composer.trim(),
      categoryId,
      isPublic,
      userId: session.user.id
    })
    
    const sheetMusic = await prisma.sheetMusic.create({
      data: {
        title: title.trim(),
        composer: composer.trim(),
        categoryId,
        isPublic,
        userId: session.user.id,
        animationDataUrl: pdfParser.serializeAnimationData(animationData),
        // Note: We don't store the original PDF file for copyright protection
      },
      include: {
        category: true,
      }
    })

    // Return success response
    return NextResponse.json({
      success: true,
      sheetMusic: {
        id: sheetMusic.id,
        title: sheetMusic.title,
        composer: sheetMusic.composer,
        categoryId: sheetMusic.categoryId,
        category: sheetMusic.category,
        isPublic: sheetMusic.isPublic,
        createdAt: sheetMusic.createdAt
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    
    // 더 자세한 오류 정보 제공
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorMessage)
    
    return NextResponse.json(
      { error: `업로드 실패: ${errorMessage}` },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}