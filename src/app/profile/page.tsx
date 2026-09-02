'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MainLayout, PageHeader, Container } from '@/components/layout'
import Card from '@/components/ui/Card'
import Loading from '@/components/ui/Loading'
import { OptimizedImage } from '@/components/ui/OptimizedImage'

/**
 * Renders a join date only once it is known. An unparseable or missing value
 * leaves the row out entirely rather than falling back to something plausible —
 * the page previously displayed the literal "2024년 1월 1일" (issue #104).
 */
function formatJoinDate(isoDate: string): string | null {
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return null

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(parsed)
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-rule py-4 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-6">
      <dt className="text-sm font-medium text-ink-muted sm:w-32 sm:shrink-0">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-sm text-ink">{value}</dd>
    </div>
  )
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [joinDate, setJoinDate] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') return

    let cancelled = false

    const loadJoinDate = async () => {
      try {
        const response = await fetch('/api/user/profile')
        if (!response.ok) return

        const data = await response.json()
        if (cancelled || typeof data?.createdAt !== 'string') return

        setJoinDate(formatJoinDate(data.createdAt))
      } catch {
        // Leaving joinDate null omits the row; the page says nothing it cannot
        // support rather than guessing.
      }
    }

    loadJoinDate()
    return () => {
      cancelled = true
    }
  }, [status])

  if (status === 'loading') {
    return <Loading />
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin')
  }

  const user = session?.user
  if (!user) {
    return <Loading />
  }

  const displayName = user.name || user.email || '이름 없음'
  const initial = (user.name || user.email || '?').charAt(0).toUpperCase()

  return (
    <MainLayout>
      <PageHeader
        title="프로필"
        description="계정 정보를 확인합니다"
      />

      <Container className="py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card padding="lg">
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
              {user.image ? (
                <OptimizedImage
                  src={user.image}
                  alt=""
                  width={80}
                  height={80}
                  // The avatar is the topmost element of the page, so waiting
                  // for it to scroll into view only delays it.
                  priority
                  lazy={false}
                  className="h-20 w-20 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-surface-muted text-2xl font-semibold text-ink-muted"
                >
                  {initial}
                </div>
              )}

              <div className="min-w-0">
                <h2 className="break-words text-xl font-semibold text-ink">
                  {displayName}
                </h2>
                {user.email && (
                  <p className="mt-1 break-all text-sm text-ink-muted">
                    {user.email}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <h3 className="text-base font-semibold text-ink">기본 정보</h3>
            <dl className="mt-2">
              <InfoRow label="이름" value={user.name || '설정되지 않음'} />
              <InfoRow label="이메일" value={user.email || '설정되지 않음'} />
              {joinDate && <InfoRow label="가입일" value={joinDate} />}
            </dl>
            <p className="mt-4 text-sm text-ink-muted">
              이름과 이메일은 로그인에 사용한 계정에서 가져오며, 이곳에서 변경할 수
              없습니다.
            </p>
          </Card>
        </div>
      </Container>
    </MainLayout>
  )
}
