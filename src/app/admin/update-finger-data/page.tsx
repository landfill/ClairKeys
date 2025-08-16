'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button, Card, Loading } from '@/components/ui'

// Check admin status via API

interface UpdateResult {
  id: string
  title: string
  composer: string
  status: 'success' | 'error' | 'skipped' | 'already_updated'
  error: string | null
  fingersAdded: number
}

interface UpdateSummary {
  total: number
  success: number
  errors: number
  skipped: number
  alreadyUpdated: number
}

export default function UpdateFingerDataPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [results, setResults] = useState<UpdateResult[]>([])
  const [summary, setSummary] = useState<UpdateSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check admin permissions
  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!session?.user?.email) {
      router.push('/auth/signin?callbackUrl=/admin/update-finger-data')
      return
    }

    // Check admin status via API
    fetch('/api/auth/is-admin')
      .then(res => res.json())
      .then(data => {
        setIsAdmin(data.isAdmin)
        setAccessDenied(!data.isAdmin)
      })
      .catch(() => {
        setIsAdmin(false)
        setAccessDenied(true)
      })
  }, [session, status, router])

  const handleUpdate = async () => {
    setIsUpdating(true)
    setError(null)
    setResults([])
    setSummary(null)

    try {
      console.log('🚀 Starting finger data update...')
      
      const response = await fetch('/api/admin/update-finger-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        setResults(data.results)
        setSummary(data.summary)
        console.log('✅ Update completed:', data.summary)
      } else {
        setError(data.error || 'Update failed')
      }
    } catch (error) {
      console.error('❌ Update error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50'
      case 'error':
        return 'text-red-600 bg-red-50'
      case 'skipped':
        return 'text-yellow-600 bg-yellow-50'
      case 'already_updated':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return '✅ 성공'
      case 'error':
        return '❌ 실패'
      case 'skipped':
        return '⏭️ 건너뜀'
      case 'already_updated':
        return '✅ 이미 업데이트됨'
      default:
        return status
    }
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card padding="lg" className="text-center">
          <Loading size="lg" className="mb-4" />
          <p className="text-gray-600">권한 확인 중...</p>
        </Card>
      </div>
    )
  }

  // Access denied state
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card padding="lg" className="text-center max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">접근 권한이 없습니다</h2>
          <p className="text-gray-600 mb-4">
            이 페이지는 관리자만 접근할 수 있습니다.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            현재 로그인: {session?.user?.email || '알 수 없음'}
          </p>
          <Button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            홈으로 돌아가기
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800">
              🎹 기존 악보 데이터 손가락 정보 업데이트
            </h1>
            <div className="text-right">
              <p className="text-sm text-green-600 font-medium">✅ 관리자 권한</p>
              <p className="text-xs text-gray-500">{session?.user?.email}</p>
            </div>
          </div>
          <p className="text-gray-600 mb-6">
            데이터베이스에 저장된 기존 악보들의 애니메이션 데이터에 손가락 번호 정보를 추가합니다.
          </p>

          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">⚠️ 주의사항</h3>
            <ul className="list-disc list-inside text-sm text-blue-600 space-y-1">
              <li>이 작업은 Supabase Storage의 애니메이션 데이터 파일을 수정합니다.</li>
              <li>기존 데이터는 덮어써지며, 복구할 수 없습니다.</li>
              <li>손가락 번호는 음악 이론에 기반한 알고리즘으로 자동 할당됩니다.</li>
              <li>이미 손가락 정보가 있는 데이터는 건너뜁니다.</li>
            </ul>
          </div>

          <div className="flex gap-4 mb-6">
            <Button
              onClick={handleUpdate}
              disabled={isUpdating}
              className={`px-6 py-3 ${
                isUpdating 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white rounded-lg font-semibold`}
            >
              {isUpdating ? (
                <>
                  <Loading className="w-4 h-4 mr-2" />
                  업데이트 중...
                </>
              ) : (
                '🚀 손가락 데이터 업데이트 시작'
              )}
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-red-800 mb-2">❌ 오류 발생</h3>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {summary && (
            <Card className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">📊 업데이트 결과 요약</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl font-bold text-gray-800">{summary.total}</div>
                  <div className="text-sm text-gray-600">전체</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">{summary.success}</div>
                  <div className="text-sm text-green-600">성공</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded">
                  <div className="text-2xl font-bold text-red-600">{summary.errors}</div>
                  <div className="text-sm text-red-600">실패</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded">
                  <div className="text-2xl font-bold text-yellow-600">{summary.skipped}</div>
                  <div className="text-sm text-yellow-600">건너뜀</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">{summary.alreadyUpdated}</div>
                  <div className="text-sm text-blue-600">기존 완료</div>
                </div>
              </div>
            </Card>
          )}

          {results.length > 0 && (
            <Card>
              <h3 className="text-xl font-bold text-gray-800 mb-4">📋 상세 결과</h3>
              <div className="space-y-3">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">
                        {result.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        by {result.composer}
                      </p>
                      {result.fingersAdded > 0 && (
                        <p className="text-sm text-green-600">
                          👆 {result.fingersAdded}개 음표에 손가락 정보 추가
                        </p>
                      )}
                      {result.error && (
                        <p className="text-sm text-red-600 mt-1">
                          오류: {result.error}
                        </p>
                      )}
                    </div>
                    <div className="ml-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          result.status
                        )}`}
                      >
                        {getStatusText(result.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🔍 현재 상태 확인</h2>
          <p className="text-gray-600 mb-4">
            업데이트 후 다음 페이지에서 손가락 번호가 제대로 표시되는지 확인하세요:
          </p>
          <div className="space-y-2">
            <div>
              <a
                href="/sheet/11"
                className="text-blue-600 hover:text-blue-800 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                📄 Canon in D (Johann Pachelbel)
              </a>
            </div>
            <div>
              <a
                href="/sheet/12"
                className="text-blue-600 hover:text-blue-800 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                📄 Für Elise (Ludwig van Beethoven)
              </a>
            </div>
            <div>
              <a
                href="/test-finger"
                className="text-green-600 hover:text-green-800 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                🧪 손가락 시각화 테스트 페이지
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}