/**
 * 처리 중 화면 (DS-3).
 *
 * 여기서 지키는 것은 두 가지다.
 *
 * 1. **아는 것만 보여준다.** 단계는 D-026 결정 4가 정한 다섯 지점뿐이고, 서비스가 보고하지 않은
 *    구간을 앞질러 그리지 않는다.
 * 2. **닿지 못한 것과 실패한 것을 구분한다.** 예전 화면은 503도, 502도, 네트워크 오류도 전부
 *    `failed`로 그렸다. 서버는 그 응답들에서 저장된 상태를 건드리지 않는데(D-026 Directive),
 *    화면만 혼자 실패를 선언한 것이다.
 */
import { act, render, screen, waitFor } from '@testing-library/react'
import OMRProcessingStatus from '../OMRProcessingStatus'

const JOB = { sheetMusicId: 42, jobId: 'job-42', title: '즉흥 환상곡' }

/** Audiveris가 실패할 때 서비스가 실제로 돌려주는 모양. */
const JAVA_STACK_TRACE =
  'java.lang.NullPointerException: Cannot invoke "org.audiveris.omr.sheet.Sheet.getStub()"\n' +
  '\tat org.audiveris.omr.sheet.BookManager.loadInput(BookManager.java:412)\n' +
  '\tat org.audiveris.omr.Main.main(Main.java:88)'

function respondWith(payload: Record<string, unknown>, ok = true, status = 200) {
  const fetchMock = jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => payload,
  })
  global.fetch = fetchMock as never
  return fetchMock
}

describe('OMRProcessingStatus', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.useRealTimers()
  })

  describe('처리 중', () => {
    it('서비스가 보고한 단계까지만 진행한 것으로 그린다', async () => {
      respondWith({ status: 'processing', progress: 30 })
      render(<OMRProcessingStatus jobs={[JOB]} />)

      // 다섯 단계가 모두 보이고, 지금 단계만 현재로 표시된다.
      for (const label of ['대기 중', 'PDF 분석', '음표 인식', '연주 데이터 생성', '학습 화면 준비']) {
        expect(screen.getByText(label)).toBeInTheDocument()
      }

      await waitFor(() => {
        expect(screen.getByText('음표 인식').closest('li')).toHaveAttribute('aria-current', 'step')
      })
      expect(screen.getByText('연주 데이터 생성').closest('li')).not.toHaveAttribute('aria-current')
    })

    it('보고되지 않은 구간을 앞질러 그리지 않는다', async () => {
      // 59는 "음표 인식"이 끝났다는 증거가 아니다.
      respondWith({ status: 'processing', progress: 59 })
      render(<OMRProcessingStatus jobs={[JOB]} />)

      await waitFor(() => {
        expect(screen.getByText('음표 인식').closest('li')).toHaveAttribute('aria-current', 'step')
      })
    })

    it('페이지를 닫아도 계속된다는 것을 고정으로 알린다', async () => {
      respondWith({ status: 'processing', progress: 10 })
      render(<OMRProcessingStatus jobs={[JOB]} />)

      // 첫 폴링 전에도, 폴링 뒤에도 있어야 한다. 잠시 뒤 사라지면 창을 닫으려는 사람이 못 본다.
      expect(screen.getByText('이 페이지를 닫아도 계속 처리됩니다.')).toBeInTheDocument()
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(screen.getByText('이 페이지를 닫아도 계속 처리됩니다.')).toBeInTheDocument()
    })

    it('남은 작업이 없으면 계속 처리된다고 말하지 않는다', async () => {
      respondWith({ status: 'completed', progress: 100, sheetMusic: { id: 42 } })
      render(<OMRProcessingStatus jobs={[JOB]} />)

      await screen.findByRole('link', { name: '연습하러 가기' })
      expect(screen.queryByText('이 페이지를 닫아도 계속 처리됩니다.')).not.toBeInTheDocument()
    })

    it('기다리는 동안 갈 곳을 준다', async () => {
      respondWith({ status: 'processing', progress: 10 })
      render(<OMRProcessingStatus jobs={[JOB]} />)

      expect(screen.getByRole('link', { name: '내 악보로 이동' })).toHaveAttribute('href', '/library')
      expect(screen.getByRole('link', { name: '다른 악보 둘러보기' })).toHaveAttribute(
        'href',
        '/explore'
      )
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    })

    it('현재 단계를 스크린리더에 전달한다', async () => {
      respondWith({ status: 'processing', progress: 60 })
      const { container } = render(<OMRProcessingStatus jobs={[JOB]} />)

      await waitFor(() => {
        const live = container.querySelector('[aria-live="polite"]')
        expect(live?.textContent).toContain('연주 데이터 생성')
      })
    })
  })

  describe('완료', () => {
    it('연습하러 가는 길을 그 자리에서 준다', async () => {
      respondWith({ status: 'completed', progress: 100, sheetMusic: { id: 42 } })
      render(<OMRProcessingStatus jobs={[JOB]} />)

      const link = await screen.findByRole('link', { name: '연습하러 가기' })
      expect(link).toHaveAttribute('href', '/sheet/42')
    })

    it('완료 뒤에는 더 묻지 않는다', async () => {
      // 가짜 타이머는 **render 전에** 켜야 한다. 폴링 간격이 진짜 타이머로 잡힌 뒤에 켜면
      // 시간을 아무리 돌려도 그 간격은 울리지 않고, 테스트는 아무것도 검사하지 않은 채 통과한다.
      jest.useFakeTimers()
      const fetchMock = respondWith({ status: 'completed', progress: 100, sheetMusic: { id: 42 } })
      render(<OMRProcessingStatus jobs={[JOB]} />)

      await act(async () => {
        await jest.advanceTimersByTimeAsync(0)
      })
      const callsAfterCompletion = fetchMock.mock.calls.length
      expect(callsAfterCompletion).toBeGreaterThan(0)

      await act(async () => {
        await jest.advanceTimersByTimeAsync(15000)
      })

      expect(fetchMock).toHaveBeenCalledTimes(callsAfterCompletion)
    })
  })

  describe('실패', () => {
    it('변환 실패에 스택 트레이스를 보여주지 않는다 (이슈 #47)', async () => {
      respondWith({
        status: 'failed',
        progress: 30,
        message: JAVA_STACK_TRACE,
        error: JAVA_STACK_TRACE,
      })
      render(<OMRProcessingStatus jobs={[JOB]} />)

      expect(await screen.findByText(/악보를 읽지 못했습니다/)).toBeInTheDocument()
      expect(document.body.textContent).not.toContain('java.lang')
      expect(document.body.textContent).not.toContain('NullPointerException')
      expect(document.body.textContent).not.toContain('Audiveris')
    })

    it('변환 실패는 더 선명한 PDF로 다시 시도하라고 안내한다 (이슈 #46)', async () => {
      respondWith({ status: 'failed', progress: 30, error: JAVA_STACK_TRACE })
      render(<OMRProcessingStatus jobs={[JOB]} />)

      expect(await screen.findByText(/선명/)).toBeInTheDocument()
    })

    it('작업 유실은 변환 실패와 다른 복구 행동을 준다', async () => {
      // 서버는 `/status` 404를 이 코드로 알린다. 이 코드가 없으면 화면은 두 실패를 구분하지
      // 못하고, 사용자는 "더 선명한 PDF"라는 도움이 되지 않는 안내를 받는다.
      respondWith({ status: 'failed', progress: 0, code: 'OMR_JOB_LOST' })
      render(<OMRProcessingStatus jobs={[JOB]} />)

      expect(await screen.findByText(/변환 작업이 사라졌습니다/)).toBeInTheDocument()
      expect(screen.getByText('같은 파일을 다시 올려 주세요.')).toBeInTheDocument()
      expect(screen.queryByText(/선명/)).not.toBeInTheDocument()
    })

    it('실패를 색이 아니라 아이콘과 문장으로 알린다', async () => {
      respondWith({ status: 'failed', progress: 30 })
      render(<OMRProcessingStatus jobs={[JOB]} />)

      const alert = await screen.findByRole('alert')
      expect(alert.querySelector('svg')).not.toBeNull()
    })
  })

  describe('서비스 불가', () => {
    it('503을 실패로 그리지 않는다', async () => {
      respondWith({ code: 'OMR_SERVICE_UNAVAILABLE' }, false, 503)
      render(<OMRProcessingStatus jobs={[JOB]} />)

      expect(await screen.findByText('변환 서비스에 연결할 수 없습니다')).toBeInTheDocument()

      // 저장된 상태는 그대로다. 화면도 실패를 선언하지 않고 단계를 계속 보여준다.
      expect(screen.queryByText(/악보를 읽지 못했습니다/)).not.toBeInTheDocument()
      expect(screen.queryByText(/변환 작업이 사라졌습니다/)).not.toBeInTheDocument()
      expect(screen.getByText('음표 인식')).toBeInTheDocument()
    })

    it('502도 실패가 아니다', async () => {
      respondWith({ code: 'OMR_SERVICE_ERROR' }, false, 502)
      render(<OMRProcessingStatus jobs={[JOB]} />)

      expect(await screen.findByText('변환 서비스에 연결할 수 없습니다')).toBeInTheDocument()
      expect(screen.queryByText(/악보를 읽지 못했습니다/)).not.toBeInTheDocument()
    })

    it('닿지 못한 뒤에도 계속 물어본다', async () => {
      // 실패로 확정해 버리면 폴링이 멈추고, 서비스가 돌아와도 화면은 영원히 실패다.
      jest.useFakeTimers()
      const fetchMock = respondWith({ code: 'OMR_SERVICE_UNAVAILABLE' }, false, 503)
      render(<OMRProcessingStatus jobs={[JOB]} />)

      await act(async () => {
        await jest.advanceTimersByTimeAsync(0)
      })
      const callsBefore = fetchMock.mock.calls.length
      expect(callsBefore).toBeGreaterThan(0)

      await act(async () => {
        await jest.advanceTimersByTimeAsync(5000)
      })

      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore)
    })

    it('설정되지 않은 서비스는 기다리라고 하지 않는다', async () => {
      respondWith({ code: 'OMR_SERVICE_NOT_CONFIGURED' }, false, 503)
      render(<OMRProcessingStatus jobs={[JOB]} />)

      expect(await screen.findByText('변환 서비스가 준비되지 않았습니다')).toBeInTheDocument()
    })
  })

  describe('폴링 수명주기', () => {
    it('앞선 조회가 끝나기 전에 다음 조회를 시작하지 않는다', async () => {
      // `setInterval`은 응답을 기다려 주지 않는다. 조회가 5초보다 오래 걸리면 요청이 겹치고,
      // 늦게 도착한 오래된 응답이 이미 완료된 작업을 다시 "처리 중"으로 되돌릴 수 있다.
      jest.useFakeTimers()
      const fetchMock = jest.fn().mockReturnValue(new Promise(() => {}))
      global.fetch = fetchMock as never

      render(<OMRProcessingStatus jobs={[JOB]} />)

      await act(async () => {
        await jest.advanceTimersByTimeAsync(0)
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)

      await act(async () => {
        await jest.advanceTimersByTimeAsync(20000)
      })

      // 첫 응답이 오지 않았으므로 여전히 한 번이어야 한다.
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('시각 계약', () => {
    it('단계 문구의 대비를 불투명도로 깎지 않는다', async () => {
      // DS-1 토큰은 불투명도 1을 전제로 대비가 계산돼 있다. `opacity-60`을 씌우면
      // `--ck-ink-muted`(흰 표면에서 6.69:1)가 2.71:1이 된다 — 토큰을 썼다는 사실이
      // 대비를 지켰다는 뜻이 되지 못한다.
      respondWith({ status: 'processing', progress: 30 })
      const { container } = render(<OMRProcessingStatus jobs={[JOB]} />)

      await waitFor(() => expect(global.fetch).toHaveBeenCalled())

      // 단계 목록만 본다. `Button`의 `disabled:opacity-50`은 비활성 상태의 신호이지 본문
      // 텍스트의 대비를 깎는 것이 아니다.
      const stageList = container.querySelector('ol')!
      expect(stageList.querySelectorAll('[class*="opacity-"]')).toHaveLength(0)
      expect(stageList.className).not.toMatch(/opacity-/)
    })

    it('링크 안에 버튼을 넣지 않는다', async () => {
      // `<a><button>`은 중첩 인터랙티브 요소다 — 키보드 포커스가 두 번 멈추고 스크린리더가
      // 같은 동작을 둘로 읽는다.
      respondWith({ status: 'completed', progress: 100, sheetMusic: { id: 42 } })
      const { container } = render(<OMRProcessingStatus jobs={[JOB]} />)

      await screen.findByRole('link', { name: '연습하러 가기' })
      expect(container.querySelectorAll('a button, button a')).toHaveLength(0)
    })
  })

  it('사용자에게 보이는 문구에 기술 용어가 없다', async () => {
    respondWith({ status: 'processing', progress: 30 })
    render(<OMRProcessingStatus jobs={[JOB]} />)

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(document.body.textContent).not.toMatch(/OMR/i)
    expect(document.body.textContent).not.toMatch(/job/i)
  })
})
