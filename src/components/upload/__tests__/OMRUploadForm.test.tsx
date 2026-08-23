import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import OMRUploadForm from '../OMRUploadForm'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

describe('OMRUploadForm tempo input', () => {
  const originalFetch = global.fetch
  let fetchMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user-1', email: 'user@example.com' }, expires: '2099-01-01' },
      status: 'authenticated',
      update: jest.fn(),
    })
    fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => [] })
    global.fetch = fetchMock
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('explains that tempo is optional and an empty value stays unknown', async () => {
    render(<OMRUploadForm />)

    expect(screen.getByLabelText('빠르기 (BPM)')).toBeInTheDocument()
    expect(screen.getByText('선택 입력입니다. 비워두면 빠르기 미상으로 표시됩니다.')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })

  it('shows an inline error for a tempo outside 20–400 before upload', async () => {
    render(<OMRUploadForm />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByLabelText('빠르기 (BPM)'), { target: { value: '401' } })
    fireEvent.change(screen.getByPlaceholderText('곡명을 입력하세요'), { target: { value: '곡명' } })
    fireEvent.change(screen.getByPlaceholderText('작곡가 또는 저작자를 입력하세요'), {
      target: { value: '작곡가' },
    })
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [new File(['pdf'], 'score.pdf', { type: 'application/pdf' })] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'OMR 처리 시작' }))

    expect(await screen.findByText('빠르기는 20에서 400 사이로 입력해 주세요.')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })
})
