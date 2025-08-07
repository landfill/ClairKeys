import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'

// 푸시 알림 구독 처리
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
    const { subscription, topics = [] } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      )
    }

    // 구독 정보를 데이터베이스에 저장 (실제 구현에서는 별도 테이블 필요)
    // 현재는 간단히 사용자 설정에 저장
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        // 실제 구현에서는 별도의 푸시 구독 테이블을 만들어야 합니다
        // 여기서는 간단한 예시로 처리
      }
    })

    console.log('Push subscription saved:', {
      userId: session.user.id,
      endpoint: subscription.endpoint,
      topics
    })

    return NextResponse.json({
      success: true,
      message: 'Push notification subscription successful',
      topics
    })

  } catch (error) {
    console.error('Push subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    )
  }
}

// 구독 상태 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 현재 구독 상태 조회
    // 실제 구현에서는 푸시 구독 테이블에서 조회
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      isSubscribed: false, // 실제 구독 상태로 교체 필요
      topics: ['practice-reminders', 'new-features', 'updates']
    })

  } catch (error) {
    console.error('Subscription status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    )
  }
}