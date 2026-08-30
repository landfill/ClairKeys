import { render, screen } from '@testing-library/react'
import Badge from '@/components/ui/Badge'

describe('Badge Component', () => {
  test('renders a rounded status badge with its label', () => {
    render(<Badge tone="success">연습 가능</Badge>)

    const badge = screen.getByText('연습 가능')
    expect(badge).toHaveClass('inline-flex', 'rounded-full', 'bg-state-ready', 'text-on-accent')
  })

  test('supports neutral metadata badges', () => {
    render(<Badge>미분류</Badge>)

    expect(screen.getByText('미분류')).toHaveClass('rounded-full', 'bg-surface-muted', 'text-ink')
  })
})
