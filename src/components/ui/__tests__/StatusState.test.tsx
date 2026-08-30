import { render, screen } from '@testing-library/react'
import StatusState from '@/components/ui/StatusState'

describe('StatusState', () => {
  it('shows what went wrong and what the user can do next', () => {
    render(
      <StatusState
        title="악보를 불러오지 못했습니다"
        detail="잠시 연결이 끊겼습니다."
        action="다시 시도해 주세요."
        tone="error"
      />
    )

    expect(screen.getByRole('heading', { name: '악보를 불러오지 못했습니다' })).toBeInTheDocument()
    expect(screen.getByText('잠시 연결이 끊겼습니다.')).toBeInTheDocument()
    expect(screen.getByText('다시 시도해 주세요.')).toBeInTheDocument()
  })

  it('renders an action when supplied', () => {
    render(<StatusState title="악보가 없습니다" detail="새 악보를 올려 보세요." action={<button>업로드</button>} />)
    expect(screen.getByRole('button', { name: '업로드' })).toBeInTheDocument()
  })
})
