'use client'

import { useOmrMonitor } from '@/hooks/useOmrMonitor'
import { ProbeStatus, stages } from '@/lib/omr/monitorContract'

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
const time = (value: string | null | undefined) => value ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }) : '수집 안 됨'
const seconds = (value: number) => `${Math.round(value).toLocaleString('ko-KR')}초`
const bytes = (value: number | null) => value === null ? '수집 안 됨' : `${(value / 1024 ** 3).toFixed(2)} GiB`

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div><dt className="text-sm text-ink-muted">{label}</dt><dd className="mt-1 break-words text-xl font-semibold tabular-nums text-ink">{value}</dd></div>
}

export default function OmrMonitor() {
  const { report, error, loading, now, refresh } = useOmrMonitor()
  const snapshot = report?.monitor.snapshot
  const stale = Boolean(error || (report && now - Date.parse(report.checkedAt) > 90000))
  const snapshotStale = Boolean(snapshot && (now - Date.parse(snapshot.sampled_at) > 90000 || Date.parse(snapshot.sampled_at) > now + 5000))
  const host = snapshot?.host
  const section = 'border-t border-rule py-7'

  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div><p className="text-sm font-medium tracking-wide text-accent">운영자 전용 · 파일럿</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">OMR 모니터링</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">웹 서버에서 본 연결과 OMR의 현재 작업을 확인합니다. 자동 경보는 제공하지 않으며, 연결 응답만으로 변환 품질을 판정하지 않습니다.</p>
      </div>
      <button type="button" onClick={refresh} disabled={loading || error === 'access'} className="min-h-11 rounded-full border border-rule px-5 text-sm text-ink hover:bg-surface-muted disabled:opacity-50">{loading ? '조회 중…' : '새로고침'}</button>
    </div>
    <div className="my-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted" aria-live="polite">
      <p>마지막 조회 성공: {time(report?.checkedAt)} KST</p><p>30초마다 갱신 · 숨겨진 탭에서는 중지</p>
    </div>
    {error === 'access' && <p role="alert" className="mb-6 text-state-error">운영자 권한을 확인할 수 없습니다. 다시 로그인하거나 접근 권한을 확인하세요.</p>}
    {stale && error !== 'access' && <p role="alert" className="mb-6 border-l-2 border-state-progress pl-4 text-state-progress">{report ? '이전 조회 결과입니다. 현재 상태로 판단하지 마세요.' : '조회하지 못했습니다. 잠시 후 다시 확인하세요.'}</p>}
    {snapshotStale && <p role="alert" className="mb-6 text-state-progress">OMR 계측 시각이 오래됐거나 시계가 맞지 않습니다. 아래 수치는 현재 상태가 아닐 수 있습니다.</p>}

    <section className={section} aria-labelledby="connection-title">
      <h2 id="connection-title" className="mb-5 text-lg font-semibold text-ink">01 / 연결 상태</h2>
      <dl className="grid gap-5 sm:grid-cols-3"><Metric label="웹 서버 → OMR health" value={report ? probeLabels[report.health.status] : loading ? '조회 중…' : '수집 안 됨'} />
        <Metric label="응답 지연" value={report?.health.latencyMs == null ? '수집 안 됨' : `${report.health.latencyMs} ms`} />
        <Metric label="계측 API" value={report ? probeLabels[report.monitor.status] : '수집 안 됨'} /></dl>
    </section>

    <section className={section} aria-labelledby="runtime-title">
      <h2 id="runtime-title" className="mb-5 text-lg font-semibold text-ink">02 / 실행 정보</h2>
      <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><Metric label="OMR 프로세스 시작" value={time(snapshot?.started_at)} />
        <Metric label="OMR 가동 시간" value={snapshot ? seconds(snapshot.uptime_seconds) : '수집 안 됨'} />
        <Metric label="OMR 계측 시각 (KST)" value={time(snapshot?.sampled_at)} /><Metric label="systemd / 컨테이너 상태" value="수집 안 됨" /></dl>
      <dl className="mt-6 grid gap-5 sm:grid-cols-2"><div><dt className="text-sm text-ink-muted">OMR 배포 SHA</dt><dd className="mt-1 break-all font-mono text-sm text-ink">{snapshot?.deployment_sha ?? '수집 안 됨 · 빌드 시 SHA 지정 필요'}</dd></div>
        <div><dt className="text-sm text-ink-muted">웹 배포 SHA</dt><dd className="mt-1 break-all font-mono text-sm text-ink">{report?.webSha ?? '수집 안 됨'}</dd></div></dl>
    </section>

    <section className={section} aria-labelledby="jobs-title">
      <h2 id="jobs-title" className="mb-5 text-lg font-semibold text-ink">03 / 변환 작업</h2>
      <dl className="grid grid-cols-2 gap-5 lg:grid-cols-5"><Metric label="시작·Audiveris 대기" value={snapshot?.jobs.queued ?? '수집 안 됨'} />
        <Metric label="변환 처리 중" value={snapshot?.jobs.processing ?? '수집 안 됨'} />
        <Metric label="최장 현재 대기" value={snapshot ? seconds(snapshot.jobs.oldest_wait_seconds) : '수집 안 됨'} />
        <Metric label="보존 범위 변환 성공" value={snapshot?.jobs.completed ?? '수집 안 됨'} />
        <Metric label="보존 범위 변환 실패" value={snapshot?.jobs.failed ?? '수집 안 됨'} /></dl>
      <p className="my-5 text-sm leading-relaxed text-ink-muted">완료 이력은 최근 1시간 중 최대 100건, 진행 중 작업은 종료까지 보존합니다. 목록은 최근 변경 100건까지 표시합니다. 통계와 작업 상태는 OMR 프로세스 재시작 시 초기화됩니다.</p>
      {!snapshot ? <p className="text-sm text-ink-muted">계측 데이터를 수집하지 못했습니다.</p> : snapshot.jobs.recent.length === 0 ? <p className="text-sm text-ink-muted">현재 보존 범위에 작업이 없습니다.</p> :
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="최근 작업 표 · 가로 스크롤 가능">
          <table className="w-full min-w-[680px] text-left text-sm"><caption className="sr-only">최근 작업의 변환 단계와 결과 전달 상태</caption>
            <thead className="border-b border-rule text-ink-muted"><tr>{['작업 ID', '변환 상태', '최근 단계 / 실패 위치', '실행 대기', 'callback', '갱신 (KST)'].map(label => <th key={label} scope="col" className="px-2 py-3 font-medium">{label}</th>)}</tr></thead>
            <tbody>{snapshot.jobs.recent.map(row => <tr key={row.id} className="border-b border-rule text-ink">
              <td className="px-2 py-3"><span className="font-mono" title={row.id}>{row.id.slice(0, 8)}</span></td>
              <td className={`px-2 py-3 ${row.status === 'failed' ? 'text-state-error' : ''}`}>{jobLabels[row.status]}</td>
              <td className="px-2 py-3">{stageLabels[row.stage]}</td><td className="px-2 py-3 tabular-nums">{row.wait_seconds === null ? '미측정' : seconds(row.wait_seconds)}</td>
              <td className="px-2 py-3">{callbackLabels[row.callback.status]} · {row.callback.attempts}회 시도</td><td className="px-2 py-3">{time(row.updated_at)}</td>
            </tr>)}</tbody></table>
        </div>}
    </section>

    <section className={section} aria-labelledby="resources-title">
      <h2 id="resources-title" className="mb-5 text-lg font-semibold text-ink">04 / 전달 및 VM 자원</h2>
      <dl className="grid gap-5 sm:grid-cols-3"><Metric label="결과 전달 중인 작업" value={snapshot?.jobs.callback_pending ?? '수집 안 됨'} />
        <Metric label="VM 호스트 메모리 · 사용 가능 / 전체" value={host?.status && host.status !== 'unavailable' ? `${bytes(host.memory_available_bytes)} / ${bytes(host.memory_total_bytes)}` : '수집 안 됨'} />
        <Metric label="VM /data 파일시스템 · 여유 / 전체" value={host?.status && host.status !== 'unavailable' ? `${bytes(host.data_free_bytes)} / ${bytes(host.data_total_bytes)}` : '수집 안 됨'} /></dl>
      <p className="mt-5 text-sm text-ink-muted">호스트 수집 시각: {time(host?.sampled_at)} KST · {host?.status === 'ok' && host.sampled_at && now - Date.parse(host.sampled_at) <= 90000 ? '30초 주기로 수집' : host?.status === 'stale' || host?.status === 'ok' ? '오래된 데이터 · 현재 값 아님' : '호스트 수집기·읽기 전용 마운트 활성화 필요'}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">callback 재시도·최종 실패는 위 작업 목록에서 확인합니다. 전달 실패는 변환 실패와 별개이며, 변환 결과의 영속 보존을 보장하지 않습니다.</p>
    </section>
  </div>
}
