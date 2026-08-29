import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from 'next-auth/react'
import { fileSignature } from '@/lib/upload/pdfInspection'
import OMRUploadForm from '../OMRUploadForm'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

function ascii(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(text, (character) => character.charCodeAt(0))
}

function pdf({ encrypted = false } = {}): Uint8Array<ArrayBuffer> {
  const trailer = encrypted
    ? 'trailer\n<< /Root 1 0 R /Encrypt 5 0 R >>\n%%EOF\n'
    : 'trailer\n<< /Root 1 0 R >>\n%%EOF\n'
  return ascii(`%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n${trailer}`)
}

function pdfFile(name = 'score.pdf', options?: { encrypted?: boolean }): File {
  // 같은 파일을 두 번 고르는 상황을 흉내 내려면 `lastModified`가 같아야 한다. 브라우저는 같은
  // 파일에 대해 같은 값을 주지만, `new File()`은 기본값으로 지금 시각을 넣는다.
  return new File([pdf(options)], name, { type: 'application/pdf', lastModified: 1_700_000_000_000 })
}

function fileInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement
}

/**
 * 파일 선택은 바이트를 읽는 비동기 검사를 거친다.
 *
 * `FileReader`의 `load`는 마이크로태스크가 아니라 매크로태스크로 도착하고, 검사는 헤더와 꼬리를
 * 차례로 두 번 읽는다. `act`가 프라미스를 비우는 것만으로는 검사가 끝나지 않으므로 타이머 큐까지
 * 비운다.
 */
async function selectFile(file: File) {
  await act(async () => {
    fireEvent.change(fileInput(), { target: { files: [file] } })
    for (let flush = 0; flush < 5; flush += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  })
}

async function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/곡명/), { target: { value: '즉흥 환상곡' } })
  fireEvent.change(screen.getByLabelText(/저작자/), { target: { value: 'Chopin' } })
}

describe('OMRUploadForm', () => {
  const originalFetch = global.fetch
  let fetchMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user-1', email: 'user@example.com' }, expires: '2099-01-01' },
      status: 'authenticated',
      update: jest.fn(),
    })
    // 기본 응답은 카테고리 목록이다. 업로드 응답이 필요한 테스트가 각자 덧붙인다.
    fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => [] })
    global.fetch = fetchMock
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('선택 전', () => {
    it('파일이 없으면 변환을 시작할 수 없다', async () => {
      render(<OMRUploadForm />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      expect(screen.getByRole('button', { name: '변환 시작하기' })).toBeDisabled()
    })

    it('Tab만으로 파일 선택에 도달한다', async () => {
      // 예전 판은 `disabled`/`hidden`이 없다는 것과 label이 있다는 것만 확인했다. 그건 도달
      // 가능성의 **필요조건**일 뿐이라, tabindex를 -1로 바꾸거나 요소를 폼 밖으로 옮겨도 통과했다.
      const user = userEvent.setup()
      render(<OMRUploadForm />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      const input = fileInput()
      let reached = false
      for (let step = 0; step < 5 && !reached; step += 1) {
        await user.tab()
        reached = document.activeElement === input
      }

      expect(reached).toBe(true)
    })

    it('포커스가 sr-only 입력에 있어도 드롭존에 보인다', async () => {
      // 파일 입력은 `sr-only`라 그 자체에는 보이는 포커스 표시가 없다. 드롭존이 `focus-within`으로
      // 받아 주지 않으면 키보드 사용자는 지금 어디에 있는지 알 수 없다 (WCAG 2.4.7).
      render(<OMRUploadForm />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      const label = document.querySelector(`label[for="${fileInput().id}"]`)!
      expect(label).toHaveTextContent('PDF 악보를 끌어다 놓거나 선택하세요')
      expect(label.className).toMatch(/focus-within:/)
    })

    it('제출 전에 예상 처리 시간과 백그라운드 처리를 알린다', async () => {
      render(<OMRUploadForm />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      // 홈이 말하는 "1~3분"과 같은 값이어야 한다. 두 화면이 다른 시간을 말하면 어느 쪽도 못 믿는다.
      expect(screen.getByText(/1~3분/)).toBeInTheDocument()
      expect(screen.getByText(/이 페이지를 닫아도 계속됩니다/)).toBeInTheDocument()
    })

    it('PDF 조건을 드롭존에서 바로 알린다', async () => {
      render(<OMRUploadForm />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      expect(screen.getByText(/최대 50MB/)).toBeInTheDocument()
      expect(screen.getByText(/암호가 걸리지 않은/)).toBeInTheDocument()
    })
  })

  describe('파일 거부', () => {
    it('암호가 걸린 PDF를 제출 전에 되돌려 준다', async () => {
      render(<OMRUploadForm />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      await selectFile(pdfFile('locked.pdf', { encrypted: true }))

      expect(await screen.findByText('암호가 걸린 PDF입니다')).toBeInTheDocument()
      expect(screen.getByText('암호를 푼 사본을 만들어 다시 선택해 주세요.')).toBeInTheDocument()
      // 거부된 파일은 선택 상태로 남지 않는다.
      expect(screen.queryByText(/선택한 파일/)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: '변환 시작하기' })).toBeDisabled()
    })

    it('확장자만 .pdf인 파일을 되돌려 준다', async () => {
      render(<OMRUploadForm />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      await selectFile(new File([ascii('\x89PNG\r\n')], 'renamed.pdf', { type: 'application/pdf' }))

      expect(await screen.findByText('이 파일은 올릴 수 없습니다')).toBeInTheDocument()
    })

    it('50MB를 넘는 파일을 되돌려 준다', async () => {
      render(<OMRUploadForm />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      const big = pdfFile('big.pdf')
      Object.defineProperty(big, 'size', { value: 50 * 1024 * 1024 + 1 })
      await selectFile(big)

      expect(await screen.findByText('파일이 너무 큽니다')).toBeInTheDocument()
      expect(
        screen.getByText('페이지를 나누거나 해상도를 낮춰 다시 내보낸 뒤 선택해 주세요.')
      ).toBeInTheDocument()
    })

    it('거부는 색이 아니라 아이콘과 문장으로 전달된다', async () => {
      render(<OMRUploadForm />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      await selectFile(pdfFile('locked.pdf', { encrypted: true }))

      const alert = await screen.findByRole('alert')
      expect(alert.querySelector('svg')).not.toBeNull()
    })
  })

  describe('변환 요청', () => {
    function respondToUploadWith(response: Record<string, unknown>, ok = true, status = 200) {
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.startsWith('/api/omr/upload')) {
          return { ok, status, json: async () => response }
        }
        return { ok: true, json: async () => [] }
      })
    }

    it('canonical 경로 하나로만 요청하고 입력한 값을 그대로 보낸다', async () => {
      respondToUploadWith({ sheetMusicId: 7, jobId: 'job-7' })
      const onUploadStart = jest.fn()
      render(<OMRUploadForm onUploadStart={onUploadStart} />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      await selectFile(pdfFile())
      await fillRequiredFields()
      fireEvent.change(screen.getByLabelText('빠르기 (BPM)'), { target: { value: '72' } })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '변환 시작하기' }))
      })

      await waitFor(() => expect(onUploadStart).toHaveBeenCalled())

      const uploadCalls = fetchMock.mock.calls.filter(([url]) => url === '/api/omr/upload')
      expect(uploadCalls).toHaveLength(1)

      const body = uploadCalls[0][1].body as FormData
      expect(body.get('title')).toBe('즉흥 환상곡')
      expect(body.get('composer')).toBe('Chopin')
      expect(body.get('tempo')).toBe('72')
      expect(onUploadStart).toHaveBeenCalledWith({
        sheetMusicId: 7,
        jobId: 'job-7',
        title: '즉흥 환상곡',
        // 어느 파일에서 나온 작업인지 페이지가 알아야 중복을 판정할 수 있다.
        signature: fileSignature(pdfFile()),
      })
    })

    it('빠르기를 비우면 값을 보내지 않는다 (D-013)', async () => {
      respondToUploadWith({ sheetMusicId: 8, jobId: 'job-8' })
      const onUploadStart = jest.fn()
      render(<OMRUploadForm onUploadStart={onUploadStart} />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      await selectFile(pdfFile())
      await fillRequiredFields()

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '변환 시작하기' }))
      })
      await waitFor(() => expect(onUploadStart).toHaveBeenCalled())

      const body = fetchMock.mock.calls.find(([url]) => url === '/api/omr/upload')![1].body as FormData
      expect(body.has('tempo')).toBe(false)
    })

    it('아직 변환 중인 파일을 다시 고르면 중복이라고 알린다', async () => {
      // 폼은 "무엇이 아직 살아 있는가"를 스스로 알지 않는다. 그것은 처리 패널까지 보는 페이지가
      // 판정하고, 끝난 작업이 목록에서 빠지는지는 `src/app/upload/__tests__/page.test.tsx`가 건다.
      const inFlight = pdfFile('duplicate.pdf')
      render(<OMRUploadForm activeSignatures={[fileSignature(inFlight)]} />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      await selectFile(pdfFile('duplicate.pdf'))

      expect(await screen.findByText('이미 올린 파일입니다')).toBeInTheDocument()
    })

    it('변환 중이 아닌 파일은 다시 고를 수 있다', async () => {
      render(<OMRUploadForm activeSignatures={[]} />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      await selectFile(pdfFile('duplicate.pdf'))

      expect(screen.queryByText('이미 올린 파일입니다')).not.toBeInTheDocument()
      expect(await screen.findByText(/선택한 파일/)).toBeInTheDocument()
    })

    it('서비스에 닿지 못하면(503) 잠시 후 재시도하라고 안내한다', async () => {
      respondToUploadWith({ code: 'OMR_SERVICE_UNAVAILABLE' }, false, 503)
      render(<OMRUploadForm />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      await selectFile(pdfFile())
      await fillRequiredFields()
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '변환 시작하기' }))
      })

      expect(await screen.findByText('변환 서비스에 연결할 수 없습니다')).toBeInTheDocument()
      expect(screen.getByText('잠시 후 다시 시도해 주세요.')).toBeInTheDocument()
    })

    it('서비스가 설정되지 않았으면 기다리라고 하지 않는다', async () => {
      respondToUploadWith({ code: 'OMR_SERVICE_NOT_CONFIGURED' }, false, 503)
      render(<OMRUploadForm />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      await selectFile(pdfFile())
      await fillRequiredFields()
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '변환 시작하기' }))
      })

      expect(await screen.findByText('변환 서비스가 준비되지 않았습니다')).toBeInTheDocument()
      expect(screen.getByText('관리자에게 문의해 주세요.')).toBeInTheDocument()
    })

    it('올라간 뒤 응답을 읽지 못하면 다시 올리라고 하지 않는다', async () => {
      // 변환은 이미 시작됐다. 여기서 "잠시 후 다시 시도해 주세요"라고 하면 사용자는 같은 파일을
      // 다시 올리고, 같은 악보의 행이 둘 생긴다.
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.startsWith('/api/omr/upload')) {
          return {
            ok: true,
            status: 200,
            json: async () => {
              throw new SyntaxError('Unexpected end of JSON input')
            },
          }
        }
        return { ok: true, json: async () => [] }
      })
      const onUploadStart = jest.fn()
      render(<OMRUploadForm onUploadStart={onUploadStart} />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      await selectFile(pdfFile())
      await fillRequiredFields()
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '변환 시작하기' }))
      })

      expect(await screen.findByText(/내 악보에서 확인해 주세요/)).toBeInTheDocument()
      expect(screen.queryByText('변환 서비스에 연결할 수 없습니다')).not.toBeInTheDocument()
      expect(onUploadStart).not.toHaveBeenCalled()
    })

    it('서버가 거부한 파일도 사용자가 할 행동으로 끝난다', async () => {
      respondToUploadWith({ error: 'Only PDF files are supported' }, false, 400)
      render(<OMRUploadForm />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      await selectFile(pdfFile())
      await fillRequiredFields()
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '변환 시작하기' }))
      })

      expect(await screen.findByText('이 파일은 올릴 수 없습니다')).toBeInTheDocument()
      // 영어 서버 문구를 그대로 옮기지 않는다.
      expect(screen.queryByText(/Only PDF files/)).not.toBeInTheDocument()
    })
  })

  describe('빠르기 입력 (D-013, 이슈 #82)', () => {
    it('선택 입력이고 비워두면 미상으로 남는다고 알린다', async () => {
      render(<OMRUploadForm />)

      expect(screen.getByLabelText('빠르기 (BPM)')).toBeInTheDocument()
      expect(
        screen.getByText('선택 입력입니다. 비워두면 빠르기 미상으로 표시됩니다.')
      ).toBeInTheDocument()
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    })

    it('20~400을 벗어난 값은 업로드 전에 막는다', async () => {
      render(<OMRUploadForm />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

      await selectFile(pdfFile())
      await fillRequiredFields()
      fireEvent.change(screen.getByLabelText('빠르기 (BPM)'), { target: { value: '401' } })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '변환 시작하기' }))
      })

      expect(
        await screen.findByText('빠르기는 20에서 400 사이로 입력해 주세요.')
      ).toBeInTheDocument()
      // 카테고리 조회 한 번뿐 — 업로드 요청은 나가지 않았다.
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  it('사용자에게 보이는 문구에 기술 용어가 없다', async () => {
    render(<OMRUploadForm />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    expect(document.body.textContent).not.toMatch(/OMR/i)
  })
})
