import { render, screen, within } from '@testing-library/react'
import { healthySnapshotFixture, snapshotFixture } from '../../../../fixtures/omr-monitor'
import { useOmrMonitor } from '@/hooks/useOmrMonitor'
import { MonitorReport, parseMonitorSnapshot } from '@/lib/omr/monitorContract'
import OmrMonitor from '../OmrMonitor'

jest.mock('@/hooks/useOmrMonitor')
const mockUseOmrMonitor = jest.mocked(useOmrMonitor)

function reportFixture(snapshot = healthySnapshotFixture()): MonitorReport {
  return {
    checkedAt: new Date().toISOString(), webSha: 'b'.repeat(40),
    health: { status: 'ok', latencyMs: 21 },
    monitor: { status: 'ok', snapshot: parseMonitorSnapshot(snapshot) },
  }
}

function show(overrides: Partial<ReturnType<typeof useOmrMonitor>> = {}) {
  mockUseOmrMonitor.mockReturnValue({
    report: reportFixture(), error: null, loading: false, now: Date.now(), refresh: jest.fn(), ...overrides,
  })
  render(<OmrMonitor />)
}

const summaryRegion = () => screen.getByRole('region', { name: '종합 상태' })
const tile = (name: string) => screen.getByRole('heading', { name, level: 3 }).parentElement!.parentElement!

describe('OmrMonitor', () => {
  test('healthy server shows normal state and two accessible usage meters', () => {
    show()
    expect(within(summaryRegion()).getByText('정상', { exact: true })).toBeInTheDocument()
    expect(screen.getAllByRole('meter')).toHaveLength(2)
    for (const name of ['메모리 사용률', '디스크 /data 사용률']) {
      expect(screen.getByRole('meter', { name })).toHaveAttribute('aria-valuenow', '25')
      expect(screen.getByRole('meter', { name })).toHaveAttribute('aria-valuemin', '0')
      expect(screen.getByRole('meter', { name })).toHaveAttribute('aria-valuemax', '100')
    }
    expect(screen.getByText('여유 12.00 GiB / 전체 16.00 GiB')).toBeInTheDocument()
    expect(screen.getByText('여유 75.00 GiB / 전체 100.00 GiB')).toBeInTheDocument()
    expect(screen.getByText(/KST 조회 · 30초마다 갱신 · 숨겨진 탭에서는 중지/)).toBeInTheDocument()
  })

  test('unavailable host shows attention and collection instructions', () => {
    const report = reportFixture()
    report.monitor.snapshot = parseMonitorSnapshot(snapshotFixture())
    show({ report })
    expect(within(summaryRegion()).getByText('주의', { exact: true })).toBeInTheDocument()
    expect(within(summaryRegion()).getByText('VM 자원을 수집하지 못함')).toBeInTheDocument()
    expect(screen.getByText('호스트 수집기·읽기 전용 마운트 활성화 필요')).toBeInTheDocument()
    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
  })

  test('health timeout shows down', () => {
    const report = reportFixture()
    report.health.status = 'timeout'
    show({ report })
    expect(within(summaryRegion()).getByText('장애', { exact: true })).toBeInTheDocument()
    expect(within(tile('연결')).getByText('시간 초과')).toBeInTheDocument()
  })

  test('connection error with previous report shows unknown and the original alert', () => {
    show({ error: 'connection' })
    expect(within(summaryRegion()).getByText('확인 불가', { exact: true })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('이전 조회 결과입니다. 현재 상태로 판단하지 마세요.')
  })

  test('unsupported monitor shows missing data rather than zero queued jobs', () => {
    const report = reportFixture()
    report.monitor = { status: 'unsupported', snapshot: null }
    show({ report })
    expect(within(tile('변환 작업')).getByText('수집 안 됨', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText(/대기 0/)).not.toBeInTheDocument()
    expect(screen.getByText('계측 데이터를 수집하지 못했습니다.')).toBeInTheDocument()
  })

  test('failed row identifies conversion failure, stage, callback and full timestamps', () => {
    const report = reportFixture()
    const row = report.monitor.snapshot!.jobs.recent[0]
    row.status = 'failed'
    row.stage = 'audiveris'
    row.callback = { status: 'exhausted', attempts: 3 }
    show({ report })
    const failedRow = screen.getByRole('row', { name: /변환 실패/ })
    expect(within(failedRow).getByText('변환 실패')).toBeInTheDocument()
    expect(within(failedRow).getByText('실패 위치 · 4/6 · Audiveris 변환')).toBeInTheDocument()
    expect(within(failedRow).getByText('재시도 소진 · 3회 시도')).toHaveClass('text-state-error')
    expect(failedRow).toHaveClass('bg-surface-muted')
    expect(within(failedRow).getByText(row.id.slice(0, 8))).toHaveAttribute('title', row.id)
    expect(within(failedRow).getByText(/^\d{2}:\d{2}:\d{2}$/)).toHaveAttribute('title')
  })

  test('access error clears numbers and table and preserves the authorization alert', () => {
    show({ report: null, error: 'access' })
    expect(screen.getByRole('alert')).toHaveTextContent('운영자 권한을 확인할 수 없습니다. 다시 로그인하거나 접근 권한을 확인하세요.')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
    expect(screen.queryByText(/응답 \d+ ms/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '새로고침' })).toBeDisabled()
  })

  test('initial loading has a live summary and no invented numbers', () => {
    show({ report: null, loading: true })
    expect(within(summaryRegion()).getByText('조회 중…')).toBeInTheDocument()
    expect(within(summaryRegion()).getByText('OMR 서버 상태를 조회하고 있습니다.')).toBeInTheDocument()
    expect(within(summaryRegion()).queryByText('현재 상태를 판단할 수 없습니다.')).not.toBeInTheDocument()
    expect(summaryRegion().querySelectorAll('[aria-live="polite"]')).toHaveLength(1)
    expect(screen.getByText('아직 조회하지 못함 · 30초마다 갱신 · 숨겨진 탭에서는 중지')).toBeInTheDocument()
  })

  test('stale host retains meters but labels them as old data', () => {
    const report = reportFixture()
    report.monitor.snapshot!.host.status = 'stale'
    show({ report })
    expect(screen.getAllByRole('meter')).toHaveLength(2)
    expect(screen.getByText('오래된 데이터 · 현재 값 아님')).toBeInTheDocument()
  })

  test('stale snapshot preserves the original timestamp warning', () => {
    const report = reportFixture()
    report.monitor.snapshot!.sampled_at = new Date(Date.now() - 90001).toISOString()
    show({ report })
    expect(screen.getByRole('alert')).toHaveTextContent('OMR 계측 시각이 오래됐거나 시계가 맞지 않습니다. 아래 수치는 현재 상태가 아닐 수 있습니다.')
  })
})
