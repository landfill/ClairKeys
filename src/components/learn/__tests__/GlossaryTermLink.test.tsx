import { render, screen } from '@testing-library/react'
import GlossaryTermLink from '../GlossaryTermLink'

describe('GlossaryTermLink', () => {
  it('applies -mx-2 px-2 for short terms (<= 3 chars without spaces) and py-3.5 for all', () => {
    render(
      <div>
        <GlossaryTermLink term="staff">오선</GlossaryTermLink>
        <GlossaryTermLink term="grand-staff">큰보표</GlossaryTermLink>
        <GlossaryTermLink term="metronome">메트로놈</GlossaryTermLink>
        <GlossaryTermLink term="count-in">준비 박자</GlossaryTermLink>
      </div>
    )

    const staffLink = screen.getByRole('link', { name: '오선' })
    expect(staffLink).toHaveAttribute('href', '/learn/glossary#term-staff')
    expect(staffLink.className).toContain('py-3.5')
    expect(staffLink.className).toContain('-mx-2')
    expect(staffLink.className).toContain('px-2')

    const grandStaffLink = screen.getByRole('link', { name: '큰보표' })
    expect(grandStaffLink).toHaveAttribute('href', '/learn/glossary#term-grand-staff')
    expect(grandStaffLink.className).toContain('py-3.5')
    expect(grandStaffLink.className).toContain('-mx-2')
    expect(grandStaffLink.className).toContain('px-2')

    const metronomeLink = screen.getByRole('link', { name: '메트로놈' })
    expect(metronomeLink).toHaveAttribute('href', '/learn/glossary#term-metronome')
    expect(metronomeLink.className).toContain('py-3.5')
    expect(metronomeLink.className).not.toContain('-mx-2')
    expect(metronomeLink.className).not.toContain('px-2')

    const countInLink = screen.getByRole('link', { name: '준비 박자' })
    expect(countInLink).toHaveAttribute('href', '/learn/glossary#term-count-in')
    expect(countInLink.className).toContain('py-3.5')
    expect(countInLink.className).not.toContain('-mx-2')
    expect(countInLink.className).not.toContain('px-2')
  })
})

