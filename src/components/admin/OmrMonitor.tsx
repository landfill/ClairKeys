'use client'

import type { ReactNode } from 'react'
import { AlertIcon, CheckIcon } from '@/components/ui/icons'
import { useOmrMonitor } from '@/hooks/useOmrMonitor'
import { ProbeStatus, stages } from '@/lib/omr/monitorContract'
import { formatDuration, summarizeMonitor, Tone } from '@/lib/omr/monitorSummary'

const probeLabels: Record<ProbeStatus, string> = {
  ok: '응답 확인', timeout: '시간 초과', unavailable: '연결 실패', http_error: '요청 거절 또는 서비스 오류',
  invalid_response: '응답 형식 오류', unsupported: '계측 미지원 · OMR 업데이트 필요', not_configured: 'OMR 연결 설정 없음',
}
const stageLabels: Record<typeof stages[number], string> = {
  queued: '작업 시작 대기', save_pdf: 'PDF 저장', audiveris_wait: 'Audiveris 실행 대기',
  audiveris: 'Audiveris 변환', xml_to_json: 'XML → JSON', callback: '결과 전달',
}
const jobLabels = { pending: '대기', processing: '처리 중', completed: '변환 성공', failed: '변환 실패' }
const callbackLabels = { not_started: '시작 전', pending: '전달 중', retrying: '재시도 대기', delivered: '전달 성공', failed: '전달 실패', exhausted: '재시도 소진' }
const toneLabels: Record<Tone, string> = { ok: '정상', attention: '주의', down: '장애', unknown: '확인 불가' }
const toneColors: Record<Tone, string> = {
  ok: 'text-state-ready', attention: 'text-state-progress', down: 'text-state-error', unknown: 'text-ink-muted',
}
const toneBorders: Record<Tone, string> = {
  ok: 'border-l-state-ready', attention: 'border-l-state-progress', down: 'border-l-state-error', unknown: 'border-l-ink-muted',
}
const descriptions: Record<Tone, string> = {
  ok: '연결·작업 계측·VM 자원이 모두 확인됐습니다.',
  attention: '서버는 응답하지만 확인할 항목이 있습니다.',
  down: '웹 서버가 OMR 서버의 응답을 받지 못했습니다.',
  unknown: '현재 상태를 판단할 수 없습니다.',
}
const time = (value: string | null | undefined) => value
  ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }) : '수집 안 됨'
const clock = (value: string) => new Date(value).toLocaleTimeString('ko-KR', {
  timeZone: 'Asia/Seoul', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
})
const bytes = (value: number) => `${(value / 1024 ** 3).toFixed(2)} GiB`

function ToneLabel({ tone, children, large = false }: { tone: Tone; children?: ReactNode; large?: boolean }) {
  const Icon = tone === 'ok' ? CheckIcon : AlertIcon
  return (
    <span className={`inline-flex items-center gap-2 ${toneColors[tone]} ${large ? 'text-3xl font-semibold' : 'text-sm font-medium'}`}>
      <Icon aria-hidden="true" size={large ? 28 : 16} className="shrink-0" />
      <span>{children ?? toneLabels[tone]}</span>
    </span>
  )
}

function Tile({ name, tone, children, detail }: { name: string; tone: Tone; children: ReactNode; detail?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-rule p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-ink-muted">{name}</h3>
        <ToneLabel tone={tone} />
      </div>
      <div className="mt-4 text-2xl font-semibold tabular-nums text-ink">{children}</div>
      {detail && <p className="mt-3 text-sm text-ink-muted">{detail}</p>}
    </div>
  )
}

function Meter({ label, percent, free, total }: { label: string; percent: number; free: number; total: number }) {
  return (
    <div className="text-sm font-normal">
      <div className="flex flex-wrap justify-between gap-x-2">
        <span>{label}</span>
        <span>{percent}% 사용</span>
      </div>
      <div
        role="meter"
        aria-label={`${label} 사용률`}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
      >
        <div className={`h-full ${percent > 90 ? 'bg-state-error' : 'bg-ink'}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-ink-muted">여유 {bytes(free)} / 전체 {bytes(total)}</p>
    </div>
  )
}

export default function OmrMonitor() {
  const { report, error, loading, now, refresh } = useOmrMonitor()
  const summary = summarizeMonitor({ report, error, now })
  const snapshot = report?.monitor.snapshot
  const host = snapshot?.host
  const section = 'mt-8 border-t border-rule pt-7'
  const hostCollected = host && host.status !== 'unavailable'

  return (
    <div className="mx-auto min-w-0 max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm font-medium tracking-wide text-accent">운영자 전용 · 파일럿</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">OMR 모니터링</h1>
        </div>
        <button type="button" onClick={refresh} disabled={loading || error === 'access'} className="min-h-11 rounded-full border border-rule px-5 text-sm text-ink hover:bg-surface-muted disabled:opacity-50">
          {loading ? '조회 중…' : '새로고침'}
        </button>
      </div>
      <p className="mt-4 text-sm text-ink-muted">
        {report ? `${clock(report.checkedAt)} KST 조회` : '아직 조회하지 못함'} · 30초마다 갱신 · 숨겨진 탭에서는 중지
      </p>

      <section aria-labelledby="summary-title" className={`mt-8 rounded-2xl border border-l-4 border-rule bg-surface p-6 ${toneBorders[summary.level]}`}>
        <h2 id="summary-title" className="sr-only">종합 상태</h2>
        <div aria-live="polite">
          <ToneLabel tone={summary.level} large>
            {loading && !report && !error ? '조회 중…' : toneLabels[summary.level]}
          </ToneLabel>
          <p className="mt-3 text-sm text-ink-muted">
            {loading && !report && !error ? 'OMR 서버 상태를 조회하고 있습니다.' : descriptions[summary.level]}
          </p>
          {summary.reasons.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink">
              {summary.reasons.map(reason => <li key={reason}>{reason}</li>)}
            </ul>
          )}
        </div>
      </section>
      {error === 'access' && (
        <p role="alert" className="mt-4 text-state-error">운영자 권한을 확인할 수 없습니다. 다시 로그인하거나 접근 권한을 확인하세요.</p>
      )}
      {summary.stale && error !== 'access' && (
        <p role="alert" className="mt-4 border-l-2 border-state-progress pl-4 text-state-progress">
          {report ? '이전 조회 결과입니다. 현재 상태로 판단하지 마세요.' : '조회하지 못했습니다. 잠시 후 다시 확인하세요.'}
        </p>
      )}
      {summary.snapshotStale && (
        <p role="alert" className="mt-4 text-state-progress">OMR 계측 시각이 오래됐거나 시계가 맞지 않습니다. 아래 수치는 현재 상태가 아닐 수 있습니다.</p>
      )}

      <section aria-labelledby="overview-title" className="mt-8">
        <h2 id="overview-title" className="sr-only">요약</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile name="연결" tone={summary.tiles.connection} detail={report ? `계측 API · ${probeLabels[report.monitor.status]}` : undefined}>
            {report ? report.health.status === 'ok'
              ? report.health.latencyMs === null ? '응답 확인' : `응답 ${report.health.latencyMs} ms`
              : probeLabels[report.health.status] : '수집 안 됨'}
          </Tile>
          <Tile
            name="변환 작업"
            tone={summary.tiles.jobs}
            detail={snapshot ? `최장 대기 ${formatDuration(snapshot.jobs.oldest_wait_seconds)} · 성공 ${snapshot.jobs.completed} · 실패 ${snapshot.jobs.failed}` : undefined}
          >
            {snapshot ? `대기 ${snapshot.jobs.queued} · 처리 ${snapshot.jobs.processing}` : '수집 안 됨'}
          </Tile>
          <Tile
            name="결과 전달"
            tone={summary.tiles.delivery}
            detail={snapshot ? `재시도 대기 ${summary.callbackRetrying} · 실패 ${summary.callbackFailed}` : undefined}
          >
            {snapshot ? `전달 중 ${snapshot.jobs.callback_pending}` : '수집 안 됨'}
          </Tile>
          <Tile
            name="VM 자원"
            tone={summary.tiles.resources}
            detail={!hostCollected ? '호스트 수집기·읽기 전용 마운트 활성화 필요'
              : summary.hostFresh ? `${clock(host.sampled_at!)} KST 수집` : '오래된 데이터 · 현재 값 아님'}
          >
            {hostCollected && summary.memoryUsedPercent !== null && summary.dataUsedPercent !== null ? (
              <div className="space-y-4">
                <Meter label="메모리" percent={summary.memoryUsedPercent} free={host.memory_available_bytes!} total={host.memory_total_bytes!} />
                <Meter label="디스크 /data" percent={summary.dataUsedPercent} free={host.data_free_bytes!} total={host.data_total_bytes!} />
              </div>
            ) : '수집 안 됨'}
          </Tile>
        </div>
      </section>

      <section className={section} aria-labelledby="jobs-title">
        <h2 id="jobs-title" className="mb-5 text-lg font-semibold text-ink">변환 작업</h2>
        {!snapshot ? (
          <p className="text-sm text-ink-muted">계측 데이터를 수집하지 못했습니다.</p>
        ) : snapshot.jobs.recent.length === 0 ? (
          <p className="text-sm text-ink-muted">현재 보존 범위에 작업이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="최근 작업 표 · 가로 스크롤 가능">
            <table className="w-full min-w-[680px] text-left text-sm">
              <caption className="sr-only">최근 작업의 변환 단계와 결과 전달 상태</caption>
              <thead className="border-b border-rule text-ink-muted">
                <tr>
                  {['작업 ID', '상태', '단계', '실행 대기', '결과 전달', '갱신 (KST)'].map(label => (
                    <th key={label} scope="col" className="px-2 py-3 font-medium">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshot.jobs.recent.map(row => (
                  <tr key={row.id} className={`border-b border-rule text-ink ${row.status === 'failed' ? 'bg-surface-muted' : ''}`}>
                    <td className="px-2 py-3">
                      <span className="font-mono" title={row.id}>{row.id.slice(0, 8)}</span>
                    </td>
                    <td className="px-2 py-3">
                      {row.status === 'failed' || row.status === 'completed' ? (
                        <ToneLabel tone={row.status === 'failed' ? 'down' : 'ok'}>{jobLabels[row.status]}</ToneLabel>
                      ) : jobLabels[row.status]}
                    </td>
                    <td className="px-2 py-3">
                      {row.status === 'failed' ? '실패 위치 · ' : ''}{stages.indexOf(row.stage) + 1}/6 · {stageLabels[row.stage]}
                    </td>
                    <td className="px-2 py-3 tabular-nums">
                      {row.wait_seconds === null ? '미측정' : formatDuration(row.wait_seconds)}
                    </td>
                    <td className={`px-2 py-3 ${row.callback.status === 'failed' || row.callback.status === 'exhausted' ? 'text-state-error' : ''}`}>
                      {callbackLabels[row.callback.status]} · {row.callback.attempts}회 시도
                    </td>
                    <td className="px-2 py-3" title={time(row.updated_at)}>{clock(row.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={`${section} text-sm`} aria-labelledby="runtime-title">
        <h2 id="runtime-title" className="mb-5 font-semibold text-ink">실행 정보</h2>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">OMR 가동 시간</dt>
            <dd className="mt-1 text-ink">{snapshot ? formatDuration(snapshot.uptime_seconds) : '수집 안 됨'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">OMR 프로세스 시작</dt>
            <dd className="mt-1 text-ink">{time(snapshot?.started_at)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">OMR 계측 시각 (KST)</dt>
            <dd className="mt-1 text-ink">{time(snapshot?.sampled_at)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-ink-muted">OMR 배포 SHA</dt>
            <dd className="mt-1 break-all font-mono text-ink">{snapshot?.deployment_sha ?? '수집 안 됨 · 빌드 시 SHA 지정 필요'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-ink-muted">웹 배포 SHA</dt>
            <dd className="mt-1 break-all font-mono text-ink">{report?.webSha ?? '수집 안 됨'}</dd>
          </div>
        </dl>
      </section>

      <section className={section} aria-labelledby="notes-title">
        <h2 id="notes-title" className="mb-5 text-lg font-semibold text-ink">표시 범위와 한계</h2>
        <ul className="list-disc pl-5 text-sm leading-relaxed text-ink-muted">
          <li>종합 상태는 이 화면을 열어 둔 동안의 표시이며 자동 경보가 아닙니다. 연결 응답만으로 변환 품질을 판정하지 않습니다.</li>
          <li>메모리·디스크는 여유가 10% 미만이면 주의로 표시합니다. 대기 시간에는 기준을 두지 않습니다.</li>
          <li>완료 이력은 최근 1시간 중 최대 100건, 진행 중 작업은 종료까지 보존합니다. 목록은 최근 변경 100건까지 표시합니다. 통계와 작업 상태는 OMR 프로세스 재시작 시 초기화됩니다.</li>
          <li>전달 실패는 변환 실패와 별개이며, 변환 결과의 영속 보존을 보장하지 않습니다.</li>
          <li>systemd·컨테이너 상태는 수집하지 않습니다.</li>
        </ul>
      </section>
    </div>
  )
}
