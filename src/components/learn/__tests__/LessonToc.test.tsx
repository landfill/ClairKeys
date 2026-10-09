import { render, fireEvent, act } from '@testing-library/react'
import { renderToString } from 'react-dom/server.node'
import { hydrateRoot, type Root } from 'react-dom/client'
import LessonToc, { ACTIVE_SECTION_BASELINE, getActiveSectionIndex } from '../LessonToc'

const BASELINE = 120

describe('getActiveSectionIndex', () => {
  // 문서 안 제목 위치(px). 0번 섹션은 뷰포트(768px)보다 길고, 2·3·4번은 짧은 섹션이 연달아 있다.
  const docTops = [0, 1600, 1700, 1760, 1800, 2600]
  const topsAt = (scrollY: number) => docTops.map(top => top - scrollY)

  it('uses a baseline that clears the narrow-screen sticky bar', () => {
    expect(ACTIVE_SECTION_BASELINE).toBe(BASELINE)
  })

  it('picks the last heading at or above the baseline while scrolling down', () => {
    expect(getActiveSectionIndex(topsAt(0), BASELINE, false)).toBe(0)
    expect(getActiveSectionIndex(topsAt(1480), BASELINE, false)).toBe(1)
    expect(getActiveSectionIndex(topsAt(1600), BASELINE, false)).toBe(2)
    expect(getActiveSectionIndex(topsAt(2500), BASELINE, false)).toBe(5)
  })

  it('returns to the previous section while scrolling back up', () => {
    // 다음 제목이 기준선 아래로 내려가면 이전 섹션의 긴 본문만 보여도 이전 섹션이다.
    expect(getActiveSectionIndex(topsAt(2500), BASELINE, false)).toBe(5)
    expect(getActiveSectionIndex(topsAt(2400), BASELINE, false)).toBe(4)
    expect(getActiveSectionIndex(topsAt(1500), BASELINE, false)).toBe(1)
    expect(getActiveSectionIndex(topsAt(1400), BASELINE, false)).toBe(0)
    expect(getActiveSectionIndex(topsAt(0), BASELINE, false)).toBe(0)
  })

  it('falls back to the first section at the top of the page', () => {
    expect(getActiveSectionIndex([300, 900, 1500], BASELINE, false)).toBe(0)
  })

  it('counts a heading exactly on the baseline', () => {
    expect(getActiveSectionIndex([-400, BASELINE, 900], BASELINE, false)).toBe(1)
    expect(getActiveSectionIndex([-400, BASELINE + 1, 900], BASELINE, false)).toBe(0)
  })

  it('keeps a section longer than the viewport active until the next heading reaches the baseline', () => {
    expect(getActiveSectionIndex([-3000, 900], BASELINE, false)).toBe(0)
    expect(getActiveSectionIndex([-3000, 300], BASELINE, false)).toBe(0)
  })

  it('picks the last of several short sections above the baseline', () => {
    expect(getActiveSectionIndex([-200, 20, 60, 110, 400], BASELINE, false)).toBe(3)
  })

  it('picks the last section at the end of the document', () => {
    expect(getActiveSectionIndex([-900, 200, 500], BASELINE, true)).toBe(2)
  })

  it('prefers the section the reader chose when the document end keeps it below the baseline', () => {
    expect(getActiveSectionIndex([-900, 200, 500], BASELINE, true, 1)).toBe(1)
    // 문서 끝이 아니면 고른 섹션보다 스크롤 위치가 우선한다.
    expect(getActiveSectionIndex([-900, 90, 500], BASELINE, false, 0)).toBe(1)
    expect(getActiveSectionIndex([-900, 200, 500], BASELINE, true, 7)).toBe(2)
  })

  it('returns -1 without sections', () => {
    expect(getActiveSectionIndex([], BASELINE, false)).toBe(-1)
    expect(getActiveSectionIndex([], BASELINE, true)).toBe(-1)
  })
})

describe('LessonToc', () => {
  const sections = [
    { id: 'sec-1', title: '섹션 1' },
    { id: 'sec-2', title: '섹션 2' },
    { id: 'sec-3', title: '섹션 3' },
    { id: 'sec-4', title: '섹션 4' },
  ]
  const headings = (
    <>
      {sections.map(section => (
        <h2 key={section.id} id={section.id} tabIndex={-1}>{section.title}</h2>
      ))}
    </>
  )

  let tops: Record<string, number>
  let frames: FrameRequestCallback[]
  let rafSpy: jest.SpyInstance
  let rectSpy: jest.SpyInstance

  const setScrollHeight = (value: number) => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value })
  }
  const flushFrames = () => {
    act(() => {
      const pending = frames
      frames = []
      pending.forEach(callback => callback(0))
    })
  }
  const scrollTo = (next: Record<string, number>) => {
    tops = next
    fireEvent.scroll(window)
    flushFrames()
  }
  const asideLink = (name: string) => document.querySelector('aside')!.querySelector(`a[href="#${sections.find(s => s.title === name)!.id}"]`)!
  const mobileLink = (name: string) => document.getElementById('mobile-lesson-toc')!.querySelector(`a[href="#${sections.find(s => s.title === name)!.id}"]`)!
  const openDetails = (details: HTMLDetailsElement) => {
    act(() => {
      details.open = true
      details.dispatchEvent(new Event('toggle'))
    })
  }

  beforeEach(() => {
    tops = { 'sec-1': 300, 'sec-2': 1300, 'sec-3': 2300, 'sec-4': 3300 }
    frames = []
    setScrollHeight(5000)
    rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      frames.push(callback)
      return frames.length
    })
    rectSpy = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const top = tops[this.id] ?? 0
      return { top, bottom: top + 28, left: 0, right: 600, width: 600, height: 28, x: 0, y: top, toJSON: () => ({}) } as DOMRect
    })
    window.history.replaceState(null, '', '/')
  })

  afterEach(() => {
    rafSpy.mockRestore()
    rectSpy.mockRestore()
    Reflect.deleteProperty(document.documentElement, 'scrollHeight')
    window.history.replaceState(null, '', '/')
  })

  it('tracks the current section from heading positions in both scroll directions', () => {
    render(<LessonToc sections={sections}>{headings}</LessonToc>)
    flushFrames()
    expect(asideLink('섹션 1')).toHaveAttribute('aria-current', 'location')

    scrollTo({ 'sec-1': -1500, 'sec-2': -500, 'sec-3': 100, 'sec-4': 1100 })
    expect(asideLink('섹션 3')).toHaveAttribute('aria-current', 'location')
    expect(mobileLink('섹션 3')).toHaveAttribute('aria-current', 'location')
    expect(document.querySelector('summary')).toHaveTextContent('섹션 3')

    // 위로 돌아가면 섹션 3 제목이 기준선 아래로 내려가고 섹션 2의 본문만 보인다.
    scrollTo({ 'sec-1': -1300, 'sec-2': -300, 'sec-3': 300, 'sec-4': 1300 })
    expect(asideLink('섹션 2')).toHaveAttribute('aria-current', 'location')
    expect(asideLink('섹션 3')).not.toHaveAttribute('aria-current')
    expect(document.querySelectorAll('aside a[aria-current]')).toHaveLength(1)
    expect(document.querySelectorAll('#mobile-lesson-toc a[aria-current]')).toHaveLength(1)
  })

  it('marks the last section at the end of the document', () => {
    render(<LessonToc sections={sections}>{headings}</LessonToc>)
    setScrollHeight(window.innerHeight + window.scrollY)
    scrollTo({ 'sec-1': -2500, 'sec-2': -1500, 'sec-3': -500, 'sec-4': 500 })
    expect(asideLink('섹션 4')).toHaveAttribute('aria-current', 'location')
  })

  it('computes once per animation frame however many scroll events arrive', () => {
    render(<LessonToc sections={sections}>{headings}</LessonToc>)
    flushFrames()
    rafSpy.mockClear()
    fireEvent.scroll(window)
    fireEvent.scroll(window)
    fireEvent(window, new Event('resize'))
    expect(rafSpy).toHaveBeenCalledTimes(1)
  })

  it('does not reattach listeners when the sections array is recreated with the same ids', () => {
    const addSpy = jest.spyOn(window, 'addEventListener')
    try {
      const { rerender } = render(<LessonToc sections={sections}>{headings}</LessonToc>)
      const scrollListeners = () => addSpy.mock.calls.filter(([type]) => type === 'scroll').length
      expect(scrollListeners()).toBe(1)
      rerender(<LessonToc sections={sections.map(section => ({ ...section }))}>{headings}</LessonToc>)
      rerender(<LessonToc sections={sections.map(section => ({ ...section }))}>{headings}</LessonToc>)
      expect(scrollListeners()).toBe(1)
    } finally {
      addSpy.mockRestore()
    }
  })

  it('keeps the section chosen from the table of contents when the document end stops it below the baseline', () => {
    render(<LessonToc sections={sections}>{headings}</LessonToc>)
    setScrollHeight(window.innerHeight + window.scrollY)
    fireEvent.click(asideLink('섹션 3'))
    scrollTo({ 'sec-1': -2400, 'sec-2': -1400, 'sec-3': 300, 'sec-4': 600 })
    expect(asideLink('섹션 3')).toHaveAttribute('aria-current', 'location')

    // 위로 스크롤하면 고른 제목(700)이 화면 안에 남아 있어도 문서 끝이 아니므로 선택이 풀린다.
    setScrollHeight(5000)
    scrollTo({ 'sec-1': -1000, 'sec-2': 0, 'sec-3': 700, 'sec-4': 1000 })
    expect(asideLink('섹션 2')).toHaveAttribute('aria-current', 'location')

    // 다시 문서 끝에 오면 C(섹션 3)가 되살아나지 않고 마지막 섹션(섹션 4)이 현재 섹션이다.
    setScrollHeight(window.innerHeight + window.scrollY)
    scrollTo({ 'sec-1': -2400, 'sec-2': -1400, 'sec-3': 300, 'sec-4': 600 })
    expect(asideLink('섹션 4')).toHaveAttribute('aria-current', 'location')
    expect(asideLink('섹션 3')).not.toHaveAttribute('aria-current')
  })

  it('starts on the section in the URL hash', () => {
    window.history.replaceState(null, '', '/#sec-2')
    setScrollHeight(window.innerHeight + window.scrollY)
    tops = { 'sec-1': -1000, 'sec-2': 96, 'sec-3': 400, 'sec-4': 700 }
    render(<LessonToc sections={sections}>{headings}</LessonToc>)
    flushFrames()
    expect(asideLink('섹션 2')).toHaveAttribute('aria-current', 'location')
  })

  it.each(['/#%', '/#%E0%A4%A'])('does not crash on malformed URL hash %s and falls back to scroll position', (path) => {
    window.history.replaceState(null, '', path)
    expect(() => {
      render(<LessonToc sections={sections}>{headings}</LessonToc>)
      flushFrames()
    }).not.toThrow()
    expect(asideLink('섹션 1')).toHaveAttribute('aria-current', 'location')
  })

  it('closes the narrow-screen list on item selection and moves focus to the arrived heading', () => {
    const { container } = render(<LessonToc sections={sections}>{headings}</LessonToc>)
    const details = container.querySelector('details')!
    openDetails(details)
    fireEvent.click(mobileLink('섹션 2'))
    expect(details.open).toBe(false)
    expect(document.activeElement).toBe(document.getElementById('sec-2'))
  })

  it('closes on Escape key press inside details immediately and returns focus to the summary', () => {
    const { container } = render(<LessonToc sections={sections}>{headings}</LessonToc>)
    const details = container.querySelector('details')!
    const summary = container.querySelector('summary')!
    const link = mobileLink('섹션 1')

    openDetails(details)
    // details 밖(예: document.body)에서 누른 Escape에는 반응하지 않는다.
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(details.open).toBe(true)

    // details를 연 직후 추가 대기 없이 details 안 요소에 Escape를 보내면 닫히고 summary로 포커스
    fireEvent.keyDown(link, { key: 'Escape' })
    expect(details.open).toBe(false)
    expect(document.activeElement).toBe(summary)

    // 다시 열고 summary에서 Escape를 눌러도 닫히고 포커스가 유지된다.
    openDetails(details)
    fireEvent.keyDown(summary, { key: 'Escape' })
    expect(details.open).toBe(false)
    expect(document.activeElement).toBe(summary)

    // 닫힌 상태에서 누른 Escape는 아무것도 하지 않는다.
    fireEvent.keyDown(summary, { key: 'Escape' })
    expect(details.open).toBe(false)
  })

  it('renders the same markup on the server and enhances the list only after hydration', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    const container = document.createElement('div')
    let root: Root | undefined
    try {
      const html = renderToString(<LessonToc sections={sections}>{headings}</LessonToc>)
      container.innerHTML = html
      document.body.appendChild(container)
      const serverDetails = container.querySelector('details')!
      // 스크립트가 없을 때 목차는 문서 흐름 안의 보통 블록이다.
      expect(serverDetails).not.toHaveAttribute('data-enhanced')
      expect(serverDetails.className).not.toMatch(/(^|\s)sticky(\s|$)/)
      expect(container.querySelector('aside a[href="#sec-1"]')).toHaveAttribute('aria-current', 'location')

      await act(async () => {
        root = hydrateRoot(container, <LessonToc sections={sections}>{headings}</LessonToc>)
      })
      expect(error).not.toHaveBeenCalled()
      expect(container.querySelector('details')).toHaveAttribute('data-enhanced')
    } finally {
      await act(async () => { root?.unmount() })
      container.remove()
      error.mockRestore()
    }
  })

  it('defers enhancement when mounted open and enhances upon closing', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    const container = document.createElement('div')
    let root: Root | undefined
    try {
      const html = renderToString(<LessonToc sections={sections}>{headings}</LessonToc>)
      container.innerHTML = html
      document.body.appendChild(container)
      const details = container.querySelector('details')!
      // hydration 전(스크립트 로드 전) 사용자가 목차를 열어 둔 상황 재현
      details.open = true

      await act(async () => {
        root = hydrateRoot(container, <LessonToc sections={sections}>{headings}</LessonToc>)
      })
      expect(error).not.toHaveBeenCalled()
      // 열려 있는 동안에는 enhancement를 미룬다
      expect(details).not.toHaveAttribute('data-enhanced')

      // 목차를 닫으면 enhancement가 붙는다
      act(() => {
        details.open = false
        details.dispatchEvent(new Event('toggle'))
      })
      expect(details).toHaveAttribute('data-enhanced')
    } finally {
      await act(async () => { root?.unmount() })
      container.remove()
      error.mockRestore()
    }
  })
})
