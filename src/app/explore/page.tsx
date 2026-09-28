'use client'

import { useRouter } from 'next/navigation'
import { MainLayout, PageHeader, Container } from '@/components/layout'
import { PublicSheetMusicBrowser } from '@/components/browse'
import { SheetMusicWithOwner } from '@/types/sheet-music'
import { Button } from '@/components/ui'

export default function ExplorePage() {
  const router = useRouter()

  const handleSheetMusicClick = (sheetMusic: SheetMusicWithOwner) => {
    // Navigate to the sheet music page
    router.push(`/sheet/${sheetMusic.id}`)
  }

  return (
    <MainLayout>
      <PageHeader
        title="공개 악보 탐색"
        description="다른 사용자들이 공유한 악보를 찾아보고 연습해보세요"
      />
      
      <Container className="py-6">
        {/* One screen: the browse and search tabs listed the same public sheets
            from two endpoints (#197, D-091). */}
        <PublicSheetMusicBrowser
          onSheetMusicClick={handleSheetMusicClick}
          className="w-full"
        />

        {/* Quick Actions */}
        <div className="fixed bottom-6 right-6">
          <div className="flex flex-col space-y-2">
            <Button
              onClick={() => router.push('/upload')}
              className="h-14 w-14 p-0 text-xl shadow-lg"
              title="악보 업로드"
              aria-label="악보 업로드"
            >
              +
            </Button>
          </div>
        </div>
      </Container>
    </MainLayout>
  )
}
