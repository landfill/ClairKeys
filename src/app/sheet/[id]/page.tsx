'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { MainLayout, PageHeader, Container } from '@/components/layout'
import { Button, Card, Loading, StatusState } from '@/components/ui'
import LoginButton from '@/components/auth/LoginButton'
import FallingNotesPlayer from '@/components/animation/FallingNotesPlayer'
import DemoProvenanceNotice from '@/components/sheet/DemoProvenanceNotice'
import type { SheetMusicProvenance } from '@prisma/client'
import type { CanonicalAnimationData } from '@/types/animationContract'
import { normalizeAnimationData, AnimationContractError } from '@/utils/animationContract'

interface SheetMusic {
  id: string
  title: string
  composer: string
  category: string | null
  isPublic: boolean
  provenance: SheetMusicProvenance
  createdAt: string
  animationData: string
}

export default function SheetMusicPage() {
  const params = useParams()
  const id = params.id as string

  const [sheetMusic, setSheetMusic] = useState<SheetMusic | null>(null)
  const [animationData, setAnimationData] = useState<CanonicalAnimationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaybackActive, setIsPlaybackActive] = useState(false)

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
          console.log(`🔍 Fetching animation data for sheet music ID: ${id}`)
          const animationUrl = data.sheetMusic.animationDataUrl
          if (!animationUrl) {
            console.error('❌ No animation URL found in sheet response')
            setError('애니메이션 데이터 URL이 없습니다.')
            return
          }
          
          console.log(`🔗 Fetching animation file from: ${animationUrl}`)
          
          // Fetch the actual animation JSON file
          const jsonResponse = await fetch(animationUrl)
          
          console.log(`📡 Animation file response status: ${jsonResponse.status}`)
          
          if (!jsonResponse.ok) {
            console.error(`❌ Failed to fetch animation file: ${jsonResponse.status}`)
            setError('애니메이션 파일을 다운로드하는 중 오류가 발생했습니다.')
            return
          }

          const responseText = await jsonResponse.text()
          console.log(`📝 Raw animation file content (first 200 chars):`, responseText.substring(0, 200))
          
          if (!responseText || responseText.trim() === '') {
            console.error('❌ Empty response from animation file')
            setError('애니메이션 파일이 비어있습니다.')
            return
          }

          try {
            // Validate + normalize against the canonical contract instead of an
            // unchecked `as` cast. Accepts canonical, legacy Shape A, and
            // converter.py-style JSON; throws AnimationContractError otherwise.
            const parsedAnimationData = normalizeAnimationData(JSON.parse(responseText))
            console.log(`✅ Successfully validated animation data`, parsedAnimationData)
            setAnimationData(parsedAnimationData)
          } catch (jsonError) {
            if (jsonError instanceof AnimationContractError) {
              console.error('❌ Animation data failed contract validation:', jsonError.message)
            } else {
              console.error('❌ Failed to parse animation JSON:', jsonError)
            }
            setError('애니메이션 데이터 형식이 올바르지 않습니다.')
            return
          }
          
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

  if (loading) {
    return (
      <MainLayout>
        <Container className="py-8" size="lg">
          <div className="flex justify-center">
            <Loading size="lg" />
          </div>
        </Container>
      </MainLayout>
    )
  }

  if (error || !sheetMusic || !animationData) {
    return (
      <MainLayout>
        <Container className="py-8" size="lg">
          <Card padding="lg">
            <StatusState
              title={error?.includes('권한') ? '이 악보에 접근할 수 없습니다' : '악보를 불러오지 못했습니다'}
              detail={error || '악보 정보를 확인할 수 없습니다.'}
              tone="error"
              action={error?.includes('권한')
                ? <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(`/sheet/${id}`)}`}><Button as="span">로그인하고 계속하기</Button></Link>
                : <Link href="/explore"><Button as="span" variant="outline">공개 악보 둘러보기</Button></Link>}
            />
          </Card>
        </Container>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
        {!isPlaybackActive && (
          <PageHeader
            title={sheetMusic.title}
            description={`${sheetMusic.composer}${sheetMusic.category ? ` • ${sheetMusic.category}` : ''}`}
          />
        )}
        
        <Container className={isPlaybackActive ? 'px-0 py-0 sm:px-0 lg:px-0' : 'py-8'} size={isPlaybackActive ? 'full' : 'lg'}>
          <DemoProvenanceNotice
            provenance={sheetMusic.provenance}
            isPlaybackActive={isPlaybackActive}
          />

          {/* Falling Notes Player - MVP Style */}
          <FallingNotesPlayer 
            animationData={animationData} 
            className={isPlaybackActive ? '' : 'mb-8'}
            onPlaybackChange={setIsPlaybackActive}
          />

          {/* Sheet Music Info */}
          {!isPlaybackActive && <Card padding="lg">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-accent">짧은 미리보기</p>
                <p className="mt-1 text-sm text-ink-muted">전체 연습은 로그인 후 이 곡에서 계속할 수 있습니다.</p>
              </div>
              <LoginButton callbackUrl={`/sheet/${id}`}>
                로그인하고 계속 연습하기
              </LoginButton>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">악보 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </Card>}
        </Container>
      </MainLayout>
  )
}
