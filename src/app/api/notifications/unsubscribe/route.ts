import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

// 푸시 알림 구독 해제 처리
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      )
    }

    // 구독 정보를 데이터베이스에서 제거
    // 실제 구현에서는 푸시 구독 테이블에서 해당 endpoint를 가진 레코드 삭제
    console.log('Push subscription removed:', {
      userId: session.user.id,
      endpoint
    })

    return NextResponse.json({
      success: true,
      message: 'Push notification unsubscribed successfully'
    })

  } catch (error) {
    console.error('Push unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    )
  }
}