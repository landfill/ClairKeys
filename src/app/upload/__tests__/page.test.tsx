/**
 * 업로드 화면 전체 배선 (DS-3).
 *
 * 폼과 처리 패널을 따로 보면 둘 다 옳은데, **합쳐 놓으면 서로의 안내를 무효로 만드는** 결함이
 * 있었다. 변환 작업이 사라지면 화면은 "같은 파일을 다시 올려 주세요"라고 말하는데, 그 파일을
 * 고르는 순간 중복 가드가 "이미 올린 파일입니다"로 막았다. 어느 컴포넌트의 단위 테스트도 이걸
 * 볼 수 없다 — 중복 가드는 폼에 있고 작업의 끝은 패널이 알기 때문이다.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import UploadPage from '../page'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

function ascii(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(text, (character) => character.charCodeAt(0))
}

const PDF = ascii('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n')

/** 같은 파일을 다시 고르는 상황을 흉내 낸다 — 브라우저는 같은 `lastModified`를 준다. */
function sameFile(): File {
  return new File([PDF], 'score.pdf', { type: 'application/pdf', lastModified: 1_700_000_000_000 })
}

function fileInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement
}

async function selectFile(file: File) {
  await act(async () => {
    fireEvent.change(fileInput(), { target: { files: [file] } })
    for (let flush = 0; flush < 5; flush += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  })
}

describe('업로드 화면 배선', () => {
  const originalFetch = global.fetch
  let statusPayload: Record<string, unknown>
  let statusOk: boolean

  beforeEach(() => {
    jest.clearAllMocks()
    statusPayload = { status: 'processing', progress: 30 }
    statusOk = true

    mockUseSession.mockReturnValue({
      data: { user: { id: 'user-1', email: 'user@example.com' }, expires: '2099-01-01' },
      status: 'authenticated',
      update: jest.fn(),
    })

    global.fetch = jest.fn(async (url: string) => {
      if (String(url).startsWith('/api/omr/upload')) {
        return { ok: true, status: 200, json: async () => ({ sheetMusicId: 42, jobId: 'job-42' }) }
      }
      if (String(url).startsWith('/api/omr/status/')) {
        return { ok: statusOk, status: statusOk ? 200 : 503, json: async () => statusPayload }
      }
      return { ok: true, json: async () => [] }
    }) as never
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  async function uploadOnce() {
    render(<UploadPage />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    await selectFile(sameFile())
    fireEvent.change(screen.getByLabelText(/곡명/), { target: { value: '즉흥 환상곡' } })
    fireEvent.change(screen.getByLabelText(/저작자/), { target: { value: 'Chopin' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '변환 시작하기' }))
    })
    await screen.findByText('변환 상태')
  }

  it('변환 중인 파일을 다시 고르면 중복이라고 알린다', async () => {
    await uploadOnce()

    await selectFile(sameFile())

    expect(await screen.findByText('이미 올린 파일입니다')).toBeInTheDocument()
  })

  it('작업이 사라진 뒤에는 같은 파일을 다시 올릴 수 있다', async () => {
    // 화면이 방금 "같은 파일을 다시 올려 주세요"라고 말했다. 그 행동이 가능해야 한다.
    statusPayload = { status: 'failed', progress: 0, code: 'OMR_JOB_LOST' }
    await uploadOnce()

    expect(await screen.findByText(/변환 작업이 사라졌습니다/)).toBeInTheDocument()
    expect(screen.getByText('같은 파일을 다시 올려 주세요.')).toBeInTheDocument()

    await selectFile(sameFile())

    expect(screen.queryByText('이미 올린 파일입니다')).not.toBeInTheDocument()
    expect(await screen.findByText(/선택한 파일/)).toBeInTheDocument()
  })

  it('변환에 실패한 뒤에도 고친 파일을 다시 올릴 수 있다', async () => {
    statusPayload = { status: 'failed', progress: 30 }
    await uploadOnce()

    expect(await screen.findByText(/악보를 읽지 못했습니다/)).toBeInTheDocument()

    await selectFile(sameFile())

    expect(screen.queryByText('이미 올린 파일입니다')).not.toBeInTheDocument()
  })

  it('완료된 뒤에도 같은 파일을 다시 올릴 수 있다', async () => {
    statusPayload = { status: 'completed', progress: 100, sheetMusic: { id: 42 } }
    await uploadOnce()

    expect(await screen.findByRole('link', { name: '연습하러 가기' })).toBeInTheDocument()

    await selectFile(sameFile())

    expect(screen.queryByText('이미 올린 파일입니다')).not.toBeInTheDocument()
  })

  it('서비스에 닿지 못하는 동안에는 여전히 변환 중이므로 중복을 막는다', async () => {
    // 503은 실패가 아니다. 작업은 살아 있고, 같은 파일을 또 올리면 행이 둘 생긴다.
    statusOk = false
    statusPayload = { code: 'OMR_SERVICE_UNAVAILABLE' }
    await uploadOnce()

    expect(await screen.findByText('변환 서비스에 연결할 수 없습니다')).toBeInTheDocument()

    await selectFile(sameFile())

    expect(await screen.findByText('이미 올린 파일입니다')).toBeInTheDocument()
  })
})
