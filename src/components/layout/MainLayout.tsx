'use client'

import { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ 
  children
}: MainLayoutProps) {
  return (
    <div className="min-h-screen">
      {/*
        여기 있던 `ProcessingStatusIndicator`는 `useBackgroundProcessing` →
        `/api/processing`·`/api/notifications`를 읽었는데, canonical 업로드 경로가 `ProcessingJob`을
        쓰지 않아 항상 `null`을 반환하면서 모든 페이지에서 두 엔드포인트를 폴링했다. 유일한 행동도
        함께 제거된 `/processing`으로 가는 것이었다 (D-026 G1-4). 대체 도달 경로는 내 악보의 상태
        배지이며 DS-4가 만든다.
      */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}