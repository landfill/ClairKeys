import {
  GLOSSARY_GROUPS,
  glossaryTermHref,
  lessonForHref,
  filterGlossary,
  type GlossaryTermId,
} from '../glossary'

const EXPECTED_TERMS: { name: string; id: GlossaryTermId }[] = [
  { name: '가운데 도', id: 'middle-c' },
  { name: '계이름', id: 'solfege' },
  { name: '오선', id: 'staff' },
  { name: '줄·칸', id: 'lines-spaces' },
  { name: '높은음자리표', id: 'treble-clef' },
  { name: '낮은음자리표', id: 'bass-clef' },
  { name: '덧줄', id: 'ledger-line' },
  { name: '큰보표', id: 'grand-staff' },
  { name: '온음표', id: 'whole-note' },
  { name: '2분음표', id: 'half-note' },
  { name: '4분음표', id: 'quarter-note' },
  { name: '8분음표', id: 'eighth-note' },
  { name: '온쉼표·2분쉼표·4분쉼표·8분쉼표', id: 'rests' },
  { name: '점음표', id: 'dotted-note' },
  { name: '박자표', id: 'time-signature' },
  { name: '마디', id: 'measure' },
  { name: '세로줄', id: 'barline' },
  { name: '손가락 번호·운지', id: 'fingering' },
  { name: '다섯 손가락 자리', id: 'five-finger-position' },
  { name: '재생 속도', id: 'playback-speed' },
  { name: '한 손 연습', id: 'one-hand-practice' },
  { name: 'A-B 구간 반복', id: 'ab-loop' },
  { name: '기다리기 모드', id: 'wait-mode' },
  { name: '메트로놈', id: 'metronome' },
  { name: '준비 박자', id: 'count-in' },
]

describe('glossary data and helpers', () => {
  it('has 25 unique term ids matching the specification and distinct from group ids', () => {
    const allTerms = GLOSSARY_GROUPS.flatMap(g => g.terms)
    expect(allTerms).toHaveLength(25)

    const groupIds = new Set(GLOSSARY_GROUPS.map(g => g.id))
    const termIds = allTerms.map(t => t.id)
    const uniqueIds = new Set(termIds)

    expect(uniqueIds.size).toBe(25)
    for (const term of allTerms) {
      expect(groupIds.has(term.id)).toBe(false)
    }

    const actualMap = new Map(allTerms.map(t => [t.name, t.id]))
    for (const expected of EXPECTED_TERMS) {
      expect(actualMap.get(expected.name)).toBe(expected.id)
    }
  })

  it('resolves a valid lesson for all 25 term hrefs with lessonForHref', () => {
    const allTerms = GLOSSARY_GROUPS.flatMap(g => g.terms)
    for (const term of allTerms) {
      const lesson = lessonForHref(term.href)
      expect(lesson).toBeDefined()
      expect(lesson?.title).toBeTruthy()
    }
    expect(lessonForHref('/non-existent')).toBeUndefined()
  })

  it('constructs correct anchor href with glossaryTermHref', () => {
    expect(glossaryTermHref('middle-c')).toBe('/learn/glossary#term-middle-c')
    expect(glossaryTermHref('whole-note')).toBe('/learn/glossary#term-whole-note')
  })

  describe('filterGlossary', () => {
    it('returns all 25 terms across all 4 groups on empty query', () => {
      const result = filterGlossary(GLOSSARY_GROUPS, {})
      expect(result).toHaveLength(4)
      const count = result.reduce((acc, g) => acc + g.terms.length, 0)
      expect(count).toBe(25)
    })

    it('returns all 25 terms when query contains only whitespace', () => {
      const result = filterGlossary(GLOSSARY_GROUPS, { query: '   ' })
      expect(result).toHaveLength(4)
      const count = result.reduce((acc, g) => acc + g.terms.length, 0)
      expect(count).toBe(25)
    })

    it('filters terms matching 박자 in either name or definition (exactly 4 terms)', () => {
      const result = filterGlossary(GLOSSARY_GROUPS, { query: '박자' })
      const termNames = result.flatMap(g => g.terms.map(t => t.name))
      expect(termNames).toEqual(['박자표', '마디', '메트로놈', '준비 박자'])
      expect(result.map(g => g.id)).toEqual(['rhythm', 'practice'])
    })

    it('performs case-insensitive search (a-b matches A-B 구간 반복)', () => {
      const result = filterGlossary(GLOSSARY_GROUPS, { query: 'a-b' })
      const termNames = result.flatMap(g => g.terms.map(t => t.name))
      expect(termNames).toEqual(['A-B 구간 반복'])
    })

    it('applies group filter and query together', () => {
      const result = filterGlossary(GLOSSARY_GROUPS, { groupId: 'practice', query: '박자' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('practice')
      const termNames = result[0].terms.map(t => t.name)
      expect(termNames).toEqual(['메트로놈', '준비 박자'])
    })

    it('returns empty array when query does not match any term', () => {
      const result = filterGlossary(GLOSSARY_GROUPS, { query: '없는말' })
      expect(result).toEqual([])
    })

    it('excludes groups with 0 matching terms', () => {
      const result = filterGlossary(GLOSSARY_GROUPS, { groupId: 'pitch' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('pitch')
    })
  })
})
