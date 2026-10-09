import { render, screen } from '@testing-library/react'
import GlossaryTermLink from '../GlossaryTermLink'

describe('GlossaryTermLink', () => {
  it('renders link to glossary entry with correct href and py-3.5 styling', () => {
    render(<GlossaryTermLink term="whole-note">온음표</GlossaryTermLink>)

    const link = screen.getByRole('link', { name: '온음표' })
    expect(link).toHaveAttribute('href', '/learn/glossary#term-whole-note')
    expect(link).toHaveTextContent('온음표')
    expect(link.className).toContain('py-3.5')
    expect(link.className).toContain('inline')
    expect(link.className).toContain('-mx-2')
    expect(link.className).toContain('px-2')
    expect(link.className).toContain('decoration-dotted')
    expect(link.className).toContain('decoration-rule-strong')
  })
})
