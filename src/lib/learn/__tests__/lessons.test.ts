import { LEARN_LESSONS, getLessonNavigation } from '../lessons'

describe('learn lessons', () => {
  it('defines the map order and keeps every L-1 lesson unavailable', () => {
    expect(LEARN_LESSONS.map(({ id, title, href, available }) => [id, title, href, available])).toEqual([
      ['keyboard', '건반', '/learn/keyboard', false],
      ['reading', '악보 읽기', '/learn/reading', false],
      ['hands', '손', '/learn/hands', false],
      ['practice', '연습 방법', '/learn/practice', false],
    ])
  })

  it('offers no neighbours while all lessons are unavailable', () => {
    for (const lesson of LEARN_LESSONS) {
      expect(getLessonNavigation(lesson.id)).toEqual({ previous: undefined, next: undefined })
    }
  })

  it('skips unavailable lessons in both directions and respects the boundaries', () => {
    const lessons = LEARN_LESSONS.map(lesson => ({ ...lesson, available: lesson.id !== 'reading' }))
    expect(getLessonNavigation('keyboard', lessons)).toEqual({ previous: undefined, next: lessons[2] })
    expect(getLessonNavigation('hands', lessons)).toEqual({ previous: lessons[0], next: lessons[3] })
    expect(getLessonNavigation('practice', lessons)).toEqual({ previous: lessons[2], next: undefined })
    expect(getLessonNavigation('reading', lessons)).toEqual({ previous: lessons[0], next: lessons[2] })
  })

  it('does not invent navigation for an unknown lesson', () => {
    expect(getLessonNavigation('unknown')).toEqual({ previous: undefined, next: undefined })
  })
})
