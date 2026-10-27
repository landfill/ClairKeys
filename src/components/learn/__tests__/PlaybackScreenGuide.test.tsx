import { fireEvent, render, screen, within } from '@testing-library/react'
import PlaybackScreenGuide from '../PlaybackScreenGuide'
import { PLAYBACK_SCREENS } from '@/lib/learn/practiceScreens'

const setup = PLAYBACK_SCREENS.find(item => item.id === 'setup')!
const variantOf = (variant: string) => document.querySelector<HTMLElement>(`[data-variant="${variant}"]`)!

it('numbers each control on both captures and explains the first one', () => {
  render(<PlaybackScreenGuide screen={setup} />)
  expect(screen.getByRole('heading', { level: 3, name: '재생 전 화면' })).toBeInTheDocument()
  expect(screen.getByRole('figure', { name: '재생 전 화면' })).toBeInTheDocument()

  const desktop = within(variantOf('desktop'))
  const mobile = within(variantOf('mobile'))
  expect(desktop.getAllByRole('button', { name: /^\d+\. / })).toHaveLength(setup.spots.length)
  // 악보 보기는 넓은 화면에서만 나오므로 휴대폰 그림에는 번호표가 없다.
  expect(mobile.queryByRole('button', { name: /악보 보기/ })).toBeNull()
  expect(mobile.getAllByRole('button', { name: /^\d+\. / })).toHaveLength(setup.spots.length - 1)
  expect(desktop.getByRole('img', { name: setup.alt })).toBeInTheDocument()

  const caption = document.querySelector('figcaption')!
  expect(caption).toHaveTextContent(setup.spots[0].label)
  expect(caption).toHaveTextContent(setup.spots[0].description)
  expect(caption).toHaveTextContent(`1 / ${setup.spots.length}`)
  expect(desktop.getByRole('button', { name: `1. ${setup.spots[0].label}` })).toHaveAttribute('aria-pressed', 'true')
})

it('moves the explanation and the highlight to the number the reader picks', () => {
  render(<PlaybackScreenGuide screen={setup} />)
  const desktop = within(variantOf('desktop'))
  const index = setup.spots.findIndex(spot => spot.id === 'loop')
  const loop = setup.spots[index]

  fireEvent.click(desktop.getByRole('button', { name: `${index + 1}. ${loop.label}` }))

  const caption = document.querySelector('figcaption')!
  expect(caption).toHaveTextContent(loop.description)
  expect(within(caption).getByRole('link', { name: '‘A-B 구간 반복’ 설명 보기' })).toHaveAttribute('href', '#ab-loop')
  expect(desktop.getByRole('button', { name: `${index + 1}. ${loop.label}` })).toHaveAttribute('aria-pressed', 'true')
  expect(desktop.getByRole('button', { name: `1. ${setup.spots[0].label}` })).toHaveAttribute('aria-pressed', 'false')
  // 두 그림 모두 고른 조작의 상자만 강조한다.
  for (const variant of ['mobile', 'desktop']) {
    const highlights = variantOf(variant).querySelectorAll('[data-testid="screen-guide-highlight"]')
    expect(highlights).toHaveLength(setup.shots[variant as 'mobile' | 'desktop'].hotspots.loop.length)
  }
})

it('steps through the controls in order with 이전 and 다음', () => {
  render(<PlaybackScreenGuide screen={setup} />)
  const previous = screen.getByRole('button', { name: '← 이전' })
  const next = screen.getByRole('button', { name: '다음 →' })
  expect(previous).toBeDisabled()
  fireEvent.click(next)
  expect(document.querySelector('figcaption')).toHaveTextContent(setup.spots[1].label)
  for (let i = 1; i < setup.spots.length - 1; i++) fireEvent.click(next)
  expect(next).toBeDisabled()
  expect(document.querySelector('figcaption')).toHaveTextContent(setup.spots.at(-1)!.description)
  fireEvent.click(previous)
  expect(document.querySelector('figcaption')).toHaveTextContent(setup.spots.at(-2)!.label)
})

it('explains a desktop-only control even where the phone picture cannot point at it', () => {
  render(<PlaybackScreenGuide screen={setup} />)
  const next = screen.getByRole('button', { name: '다음 →' })
  for (let i = 1; i < setup.spots.length; i++) fireEvent.click(next)
  expect(document.querySelector('figcaption')).toHaveTextContent('악보 보기')
  expect(variantOf('mobile').querySelectorAll('[data-testid="screen-guide-highlight"]')).toHaveLength(0)
  expect(variantOf('desktop').querySelectorAll('[data-testid="screen-guide-highlight"]')).toHaveLength(1)
})

it('takes one Tab stop per picture and moves between numbers with the arrow keys', () => {
  render(<PlaybackScreenGuide screen={setup} />)
  const desktop = within(variantOf('desktop'))
  const badges = desktop.getAllByRole('button', { name: /^\d+\. / })
  expect(badges.filter(badge => badge.tabIndex === 0)).toHaveLength(1)
  badges[0].focus()
  fireEvent.keyDown(badges[0], { key: 'ArrowRight' })
  expect(badges[1]).toHaveFocus()
  expect(badges[1]).toHaveAttribute('aria-pressed', 'true')
  expect(badges[1].tabIndex).toBe(0)
  expect(document.querySelector('figcaption')).toHaveTextContent(setup.spots[1].description)
  fireEvent.keyDown(badges[1], { key: 'End' })
  expect(badges.at(-1)).toHaveFocus()
  fireEvent.keyDown(badges.at(-1)!, { key: 'Home' })
  expect(badges[0]).toHaveFocus()
})

it('keeps the phone picture reachable by Tab while a desktop-only control is explained', () => {
  render(<PlaybackScreenGuide screen={setup} />)
  const next = screen.getByRole('button', { name: '다음 →' })
  for (let i = 1; i < setup.spots.length; i++) fireEvent.click(next)
  const mobileBadges = within(variantOf('mobile')).getAllByRole('button', { name: /^\d+\. / })
  expect(mobileBadges.filter(badge => badge.tabIndex === 0)).toEqual([mobileBadges.at(-1)])
  fireEvent.keyDown(mobileBadges.at(-1)!, { key: 'ArrowLeft' })
  expect(mobileBadges.at(-2)).toHaveFocus()
})

it('draws the phone landscape playing capture at its own width inside a sideways scroller', () => {
  const playing = PLAYBACK_SCREENS.find(item => item.id === 'playing')!
  expect(playing.shots.mobile.displayWidth).toBeGreaterThan(390)
  render(<PlaybackScreenGuide screen={playing} />)
  const mobile = variantOf('mobile')
  const scroller = mobile.querySelector<HTMLElement>('[data-screen-scroller]')!
  expect(scroller).toBeInTheDocument()
  expect((scroller.firstElementChild as HTMLElement).style.width).toBe(`${playing.shots.mobile.displayWidth}px`)
  expect(within(mobile).getByText(playing.scrollNote!)).toHaveAttribute('data-lesson-note')
  // 데스크톱 그림은 본문 폭에 맞춰 그리고 옆으로 밀지 않는다.
  expect(variantOf('desktop').querySelector('[data-screen-scroller]')).toBeNull()
  expect(within(variantOf('desktop')).queryByText(playing.scrollNote!)).toBeNull()
})
