'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertIcon, Button, CheckIcon } from '@/components/ui'
import { PROCESSING_STAGES, stageIndexForProgress } from '@/lib/upload/processingStages'
import {
  describeConversionFailure,
  describeJobLost,
  describeServiceUnavailable,
  JOB_LOST_CODE,
  type UploadFailure,
} from '@/lib/upload/uploadFailures'

interface ProcessingJob {
  sheetMusicId: number
  jobId: string
  title?: string
}

interface OMRProcessingStatusProps {
  jobs: ProcessingJob[]
}

type JobPhase = 'processing' | 'completed' | 'failed'

interface JobState {
  phase: JobPhase
  /** 서비스가 마지막으로 보고한 `progress`. 단계 문구는 여기서만 나온다. */
  progress: number
  /** `failed`일 때의 실패 안내. 서버 문자열은 담기지 않는다. */
  failure: UploadFailure | null
  /**
   * 상태를 확인하지 **못한** 동안의 안내.
   *
   * 실패와 구분해서 들고 있는 것이 이 컴포넌트에서 가장 중요한 구분이다. 닿지 못한 것은
   * 실패가 아니고, 서버도 그렇게 동작한다 — `/api/omr/status/[jobId]`는 404에서만 행을 실패로
   * 바꾸고 503·502에서는 저장된 상태를 그대로 둔다 (D-026 Directive). 예전 화면은 이 응답들을
   * 모두 `failed`로 그려서, 서버가 "아직 모른다"고 말한 작업을 사용자에게 "실패했다"고 알렸다.
   */
  transient: UploadFailure | null
}

const POLL_INTERVAL_MS = 5000

function initialState(): JobState {
  return { phase: 'processing', progress: 0, failure: null, transient: null }
}

export default function OMRProcessingStatus({ jobs }: OMRProcessingStatusProps) {
  const [states, setStates] = useState<Record<string, JobState>>({})
  const statesRef = useRef(states)

  useEffect(() => {
    statesRef.current = states
  }, [states])

  // 새 작업만 초기화한다. 예전 구현은 `jobs`가 바뀔 때마다 전체를 초기화해서, 두 번째 파일을
  // 올리는 순간 첫 번째 작업의 진행 상태가 `대기 중`으로 되돌아갔다.
  useEffect(() => {
    setStates(prev => {
      let changed = false
      const next = { ...prev }
      for (const job of jobs) {
        if (!next[job.jobId]) {
          next[job.jobId] = initialState()
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [jobs])

  const applyPollResult = useCallback(
    (job: ProcessingJob, update: (previous: JobState) => JobState) => {
      setStates(prev => ({ ...prev, [job.jobId]: update(prev[job.jobId] ?? initialState()) }))
    },
    []
  )

  useEffect(() => {
    if (jobs.length === 0) return

    let cancelled = false

    const pollOnce = async () => {
      for (const job of jobs) {
        if (cancelled) return

        const current = statesRef.current[job.jobId]
        if (current && current.phase !== 'processing') continue

        try {
          const response = await fetch(`/api/omr/status/${encodeURIComponent(job.jobId)}`)

          if (cancelled) return

          if (!response.ok) {
            const body = await response.json().catch(() => ({}))
            const notConfigured =
              body?.code === 'OMR_SERVICE_NOT_CONFIGURED' ||
              body?.code === 'OMR_CALLBACK_NOT_CONFIGURED'

            // 저장된 상태를 실패로 바꾸지 않는다. 다음 폴링에서 다시 물어본다.
            applyPollResult(job, previous => ({
              ...previous,
              transient: describeServiceUnavailable(notConfigured),
            }))
            continue
          }

          const data = await response.json()
          if (cancelled) return

          if (data.status === 'completed' && data.sheetMusic) {
            applyPollResult(job, previous => ({
              ...previous,
              phase: 'completed',
              progress: 100,
              transient: null,
            }))
            continue
          }

          if (data.status === 'failed') {
            // 어느 실패인지는 응답 코드로만 가른다. 서버가 보낸 문장은 읽지 않는다 —
            // 변환 실패의 그 문장이 Java 스택 트레이스다 (이슈 #47).
            const failure = data.code === JOB_LOST_CODE ? describeJobLost() : describeConversionFailure()

            applyPollResult(job, previous => ({
              ...previous,
              phase: 'failed',
              failure,
              transient: null,
            }))
            continue
          }

          applyPollResult(job, previous => ({
            ...previous,
            phase: 'processing',
            progress: typeof data.progress === 'number' ? data.progress : previous.progress,
            transient: null,
          }))
        } catch (error) {
          if (cancelled) return

          // 네트워크가 끊겼거나 응답을 해석하지 못한 경우다. 서버가 무엇을 알고 있는지는
          // 여전히 모르므로, 모른다고 표시하고 폴링을 계속한다.
          console.error(`Failed to read processing status for ${job.jobId}:`, error)
          applyPollResult(job, previous => ({
            ...previous,
            transient: describeServiceUnavailable(),
          }))
        }
      }
    }

    void pollOnce()
    const interval = setInterval(() => void pollOnce(), POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [jobs, applyPollResult])

  if (jobs.length === 0) {
    return null
  }

  const anyProcessing = jobs.some(job => (states[job.jobId] ?? initialState()).phase === 'processing')

  return (
    <section className="rounded-lg border border-rule bg-surface p-6" aria-labelledby="processing-heading">
      <h2 id="processing-heading" className="text-lg font-semibold text-ink">
        변환 상태
      </h2>

      {/*
        처리가 남아 있는 동안에는 고정으로 보인다 — 접거나 잠시 뒤 감추지 않는다. 이 문장이 정작
        필요한 사람은 창을 닫으려는 사람이고, 그 사람이 못 보면 문장이 없는 것과 같다.

        남은 작업이 없을 때만 내린다. 전부 끝난 화면에서 "계속 처리됩니다"는 고정 노출이 아니라
        사실이 아닌 문장이다.
      */}
      {anyProcessing && (
        <p className="mt-1 text-sm text-ink-muted">이 페이지를 닫아도 계속 처리됩니다.</p>
      )}

      <ul className="mt-4 space-y-4">
        {jobs.map(job => {
          const state = states[job.jobId] ?? initialState()
          return (
            <li key={job.jobId} className="rounded-md border border-rule p-4">
              <JobCard job={job} state={state} />
            </li>
          )
        })}
      </ul>

      <div className="mt-6 flex flex-wrap gap-3 border-t border-rule pt-4">
        <Link href="/library">
          <Button variant="outline" size="sm">
            내 악보로 이동
          </Button>
        </Link>
        <Link href="/explore">
          <Button variant="ghost" size="sm">
            다른 악보 둘러보기
          </Button>
        </Link>
      </div>
    </section>
  )
}

function JobCard({ job, state }: { job: ProcessingJob; state: JobState }) {
  const title = job.title?.trim() || '올린 악보'

  if (state.phase === 'failed' && state.failure) {
    return (
      <div className="flex gap-3" role="alert">
        <AlertIcon size={20} className="mt-0.5 shrink-0 text-state-error" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-ink">
            {title} — {state.failure.title}
          </h3>
          <p className="mt-1 text-sm text-ink-muted">{state.failure.detail}</p>
          <p className="mt-1 text-sm text-ink">{state.failure.action}</p>
        </div>
      </div>
    )
  }

  if (state.phase === 'completed') {
    return (
      <div className="flex gap-3">
        <CheckIcon size={20} className="mt-0.5 shrink-0 text-state-ready" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-ink">{title} — 연습할 수 있습니다</h3>
          <p className="mt-1 text-sm text-ink-muted">변환이 끝났습니다.</p>
          <div className="mt-3">
            <Link href={`/sheet/${job.sheetMusicId}`}>
              <Button size="sm">연습하러 가기</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <ProcessingCard title={title} state={state} />
}

function ProcessingCard({ title, state }: { title: string; state: JobState }) {
  const currentIndex = stageIndexForProgress(state.progress)
  const currentStage = PROCESSING_STAGES[currentIndex]

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>

      {/*
        단계는 목록으로 보여준다. 진행 바 하나만 두면 "얼마나 남았는지"는 알려주지만 "지금 무엇을
        하고 있는지"는 알려주지 못한다. 서비스가 보고하는 지점이 다섯뿐이라 막대가 한동안 멈춰
        있는 것처럼 보이는데, 그때 이름이 붙은 단계가 그것이 고장이 아니라는 것을 말해 준다.
      */}
      <ol className="mt-3 space-y-1.5">
        {PROCESSING_STAGES.map((stage, index) => {
          const done = index < currentIndex
          const active = index === currentIndex
          return (
            <li
              key={stage.progress}
              aria-current={active ? 'step' : undefined}
              className={`flex items-center gap-2 text-sm ${
                active ? 'font-semibold text-ink' : done ? 'text-ink-muted' : 'text-ink-muted opacity-60'
              }`}
            >
              {/* 형태로도 구분한다 — 색만으로 상태를 나누지 않는다. */}
              {done ? (
                <CheckIcon size={16} className="shrink-0 text-state-ready" aria-hidden="true" />
              ) : (
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    active ? 'bg-state-progress' : 'bg-rule'
                  }`}
                />
              )}
              <span>{stage.label}</span>
              {done && <span className="sr-only">완료</span>}
              {active && <span className="sr-only">진행 중</span>}
            </li>
          )
        })}
      </ol>

      <p aria-live="polite" className="sr-only">
        {title} — {currentStage.label}
      </p>

      {state.transient && (
        <div className="mt-3 flex gap-2 rounded-md border border-rule bg-surface-muted p-3">
          <AlertIcon size={16} className="mt-0.5 shrink-0 text-state-progress" aria-hidden="true" />
          <div>
            <p className="text-sm text-ink">{state.transient.title}</p>
            <p className="mt-0.5 text-sm text-ink-muted">{state.transient.detail}</p>
          </div>
        </div>
      )}
    </div>
  )
}
