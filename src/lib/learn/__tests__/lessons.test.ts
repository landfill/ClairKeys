import { LEARN_LESSONS, getLessonNavigation } from '../lessons'

describe('learn lessons', () => {
  it('defines the map order with all five lessons published', () => {
    expect(LEARN_LESSONS.map(({ id, title, href, available }) => [id, title, href, available])).toEqual([
      ['keyboard', '건반', '/learn/keyboard', true],
      ['reading', '악보 읽기 1', '/learn/reading', true],
      ['reading-rhythm', '악보 읽기 2', '/learn/reading/rhythm', true],
      ['hands', '손', '/learn/hands', true],
      ['practice', '연습 방법', '/learn/practice', true],
    ])
  })

  it('describes what every lesson covers with topics and an activity', () => {
    for (const lesson of LEARN_LESSONS) {
      expect(lesson.topics.length).toBeGreaterThan(0)
      lesson.topics.forEach(topic => expect(topic.trim()).not.toBe(''))
      expect(new Set(lesson.topics).size).toBe(lesson.topics.length)
      expect(lesson.activity.trim()).not.toBe('')
    }
  })

  it('offers no neighbours while all lessons are unavailable', () => {
    for (const lesson of LEARN_LESSONS) {
      expect(getLessonNavigation(lesson.id, LEARN_LESSONS.map(item => ({ ...item, available: false })))).toEqual({ previous: undefined, next: undefined })
    }
  })

  it('links hands to reading-rhythm and practice', () => {
    expect(getLessonNavigation('hands')).toEqual({ previous: LEARN_LESSONS[2], next: LEARN_LESSONS[4] })
    expect(getLessonNavigation('practice')).toEqual({ previous: LEARN_LESSONS[3], next: undefined })
  })

  it('links keyboard forward to reading, reading between keyboard and reading-rhythm, and reading-rhythm between reading and hands', () => {
    expect(getLessonNavigation('keyboard')).toEqual({ previous: undefined, next: LEARN_LESSONS[1] })
    expect(getLessonNavigation('reading')).toEqual({ previous: LEARN_LESSONS[0], next: LEARN_LESSONS[2] })
    expect(getLessonNavigation('reading-rhythm')).toEqual({ previous: LEARN_LESSONS[1], next: LEARN_LESSONS[3] })
  })

  it('skips unavailable lessons in both directions and respects the boundaries', () => {
    const lessons = LEARN_LESSONS.map(lesson => ({ ...lesson, available: lesson.id !== 'reading' }))
    expect(getLessonNavigation('keyboard', lessons)).toEqual({ previous: undefined, next: lessons[2] })
    expect(getLessonNavigation('hands', lessons)).toEqual({ previous: lessons[2], next: lessons[4] })
    expect(getLessonNavigation('practice', lessons)).toEqual({ previous: lessons[3], next: undefined })
    expect(getLessonNavigation('reading', lessons)).toEqual({ previous: lessons[0], next: lessons[2] })
  })

  it('does not invent navigation for an unknown lesson', () => {
    expect(getLessonNavigation('unknown')).toEqual({ previous: undefined, next: undefined })
  })
})
