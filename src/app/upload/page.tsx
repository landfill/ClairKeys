'use client'

import { useCallback, useMemo, useState } from 'react'
import { MainLayout, PageHeader, Container } from '@/components/layout'
import AuthGuard from '@/components/auth/AuthGuard'
import OMRUploadForm from '@/components/upload/OMRUploadForm'
import OMRProcessingStatus from '@/components/upload/OMRProcessingStatus'

interface ProcessingJob {
  sheetMusicId: number
  jobId: string
  title?: string
  /** 이 작업이 어느 파일에서 나왔는지. 중복 판정의 근거다. */
  signature: string
}

export default function UploadPage() {
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([])
  const [settledJobIds, setSettledJobIds] = useState<ReadonlySet<string>>(() => new Set())

  const handleUploadStart = useCallback(
    (data: { sheetMusicId: number; jobId: string; title: string; signature: string }) => {
      setProcessingJobs(prev => [
        ...prev,
        {
          sheetMusicId: data.sheetMusicId,
          jobId: data.jobId,
          title: data.title,
          signature: data.signature,
        },
      ])
    },
    []
  )

  const handleJobSettled = useCallback((jobId: string) => {
    setSettledJobIds(prev => (prev.has(jobId) ? prev : new Set(prev).add(jobId)))
  }, [])

  /**
   * 아직 변환 중인 파일들.
   *
   * 폼의 중복 가드가 읽는 유일한 근거다. 끝난 작업을 여기 남겨 두면, 처리 패널이 "같은 파일을
   * 다시 올려 주세요"라고 말한 직후 폼이 그 파일을 "이미 올린 파일"로 막는다 — 화면이 자기
   * 안내를 스스로 무효로 만든다.
   */
  const activeSignatures = useMemo(
    () => processingJobs.filter(job => !settledJobIds.has(job.jobId)).map(job => job.signature),
    [processingJobs, settledJobIds]
  )

  return (
    <AuthGuard>
      <MainLayout>
        <PageHeader
          title="새 악보 올리기"
          description="PDF 악보를 올리면 따라 칠 수 있는 연주 화면으로 바꿔 드립니다."
        />

        <Container className="py-8" size="lg">
          {/*
            One upload path. The "백그라운드 처리" and "즉시 처리" modes that used
            to sit beside this one produced a melody chosen by PDF file size,
            not by reading the score, and stored it as a real result — see D-010.
          */}
          <div className="mx-auto max-w-4xl space-y-6">
            <OMRUploadForm onUploadStart={handleUploadStart} activeSignatures={activeSignatures} />

            {/*
              끝난 작업도 목록에 남긴다. 예전에는 완료 3초 뒤에 지웠는데, 완료가 전달되는 통로는
              두 개뿐이고(업로드 화면의 인라인 완료와 내 악보의 상태 배지 — D-026 결정 5) 그중
              하나가 3초 만에 사라지면 잠깐 다른 탭을 보고 온 사용자에게는 아무 일도 일어나지 않은
              것처럼 보인다. 연습하러 가는 링크도 함께 사라졌다.
            */}
            {processingJobs.length > 0 && (
              <OMRProcessingStatus jobs={processingJobs} onJobSettled={handleJobSettled} />
            )}
          </div>
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}
