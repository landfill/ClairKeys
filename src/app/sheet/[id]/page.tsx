'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { MainLayout, PageHeader, Container } from '@/components/layout'
import { Card, Loading } from '@/components/ui'
import AuthGuard from '@/components/auth/AuthGuard'
import PianoKeyboard from '@/components/piano/PianoKeyboard'
import AnimationPlayer from '@/components/animation/AnimationPlayer'
import { PianoAnimationData } from '@/services/pdfParser'

interface SheetMusic {
  id: string
  title: string
  composer: string
  category: string | null
  isPublic: boolean
  createdAt: string
  animationData: string
}

export default function SheetMusicPage() {
  const params = useParams()
  const id = params.id as string

  const [sheetMusic, setSheetMusic] = useState<SheetMusic | null>(null)
  const [animationData, setAnimationData] = useState<PianoAnimationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [highlightedKeys, setHighlightedKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!id) return

    const fetchSheetMusic = async () => {
      try {
        const response = await fetch(`/api/sheet/${id}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('악보를 찾을 수 없습니다.')
          } else if (response.status === 403) {
            setError('이 악보에 접근할 권한이 없습니다.')
          } else {
            setError('악보를 불러오는 중 오류가 발생했습니다.')
          }
          return
        }

        const data = await response.json()
        setSheetMusic(data.sheetMusic)

        // Load animation data from file storage
        try {
          const animationResponse = await fetch(`/api/files/animation?sheetMusicId=${id}`)
          
          if (!animationResponse.ok) {
            if (animationResponse.status === 404) {
              setError('애니메이션 데이터를 찾을 수 없습니다.')
            } else {
              setError('애니메이션 데이터를 불러오는 중 오류가 발생했습니다.')
            }
            return
          }

          const animationUrlData = await animationResponse.json()
          
          // Fetch the actual animation JSON file
          const jsonResponse = await fetch(animationUrlData.url)
          
          if (!jsonResponse.ok) {
            setError('애니메이션 파일을 다운로드하는 중 오류가 발생했습니다.')
            return
          }

          const parsedAnimationData = await jsonResponse.json() as PianoAnimationData
          setAnimationData(parsedAnimationData)
          
        } catch (parseError) {
          console.error('Failed to load animation data:', parseError)
          setError('애니메이션 데이터를 로딩하는 중 오류가 발생했습니다.')
        }

      } catch (fetchError) {
        console.error('Failed to fetch sheet music:', fetchError)
        setError('네트워크 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchSheetMusic()
  }, [id])

  const handleNotePlay = (note: string) => {
    setHighlightedKeys(prev => new Set(prev).add(note))
  }

  const handleNoteStop = (note: string) => {
    setHighlightedKeys(prev => {
      const newSet = new Set(prev)
      newSet.delete(note)
      return newSet
    })
  }

  if (loading) {
    return (
      <AuthGuard>
        <MainLayout>
          <Container className="py-8" size="lg">
            <div className="flex justify-center">
              <Loading size="lg" />
            </div>
          </Container>
        </MainLayout>
      </AuthGuard>
    )
  }

  if (error || !sheetMusic || !animationData) {
    return (
      <AuthGuard>
        <MainLayout>
          <Container className="py-8" size="lg">
            <Card padding="lg">
              <div className="text-center">
                <div className="text-4xl mb-4">❌</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  오류가 발생했습니다
                </h2>
                <p className="text-gray-600">
                  {error || '알 수 없는 오류가 발생했습니다.'}
                </p>
              </div>
            </Card>
          </Container>
        </MainLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <MainLayout>
        <PageHeader
          title={sheetMusic.title}
          description={`${sheetMusic.composer}${sheetMusic.category ? ` • ${sheetMusic.category}` : ''}`}
          breadcrumbs={[
            { label: '홈', href: '/' },
            { label: '라이브러리', href: '/library' },
            { label: sheetMusic.title }
          ]}
        />
        
        <Container className="py-8" size="lg">
          <div className="space-y-8">
            {/* Animation Player */}
            <Card padding="lg">
              <AnimationPlayer
                animationData={animationData}
                onNotePlay={handleNotePlay}
                onNoteStop={handleNoteStop}
              />
            </Card>

            {/* Piano Keyboard */}
            <Card padding="lg">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">피아노 건반</h3>
                <p className="text-gray-600">
                  애니메이션을 재생하면 건반이 강조되어 표시됩니다
                </p>
              </div>
              <PianoKeyboard
                highlightedKeys={highlightedKeys}
                onKeyPress={(note) => {
                  // Handle manual key press if needed
                  console.log('Manual key press:', note)
                }}
                className="w-full"
              />
            </Card>

            {/* Sheet Music Info */}
            <Card padding="lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">악보 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">곡명</dt>
                  <dd className="text-sm text-gray-900">{sheetMusic.title}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">저작자</dt>
                  <dd className="text-sm text-gray-900">{sheetMusic.composer}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">카테고리</dt>
                  <dd className="text-sm text-gray-900">{sheetMusic.category || '미분류'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">공개 설정</dt>
                  <dd className="text-sm text-gray-900">
                    {sheetMusic.isPublic ? '공개' : '비공개'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">업로드 날짜</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(sheetMusic.createdAt).toLocaleDateString('ko-KR')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">재생 시간</dt>
                  <dd className="text-sm text-gray-900">
                    {Math.floor(animationData.duration / 60)}분 {Math.floor(animationData.duration % 60)}초
                  </dd>
                </div>
              </div>
            </Card>
          </div>
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}