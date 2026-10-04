import { quarterBeats, measureQuarterBeats, rhythmMusicXml, describeRhythm, rhythmTimeline, RHYTHM_EXAMPLES } from '../rhythm'

it('uses literal quarter-note-relative lengths including dotted values', () => {
  expect(['whole', 'half', 'quarter', 'eighth'].map(value => quarterBeats(value as 'whole' | 'half' | 'quarter' | 'eighth'))).toEqual([4, 2, 1, 0.5])
  expect(quarterBeats('half', true)).toBe(3)
  expect(quarterBeats('quarter', true)).toBe(1.5)
})
it('uses the exact total lengths of the three meters', () => {
  expect(measureQuarterBeats('4/4')).toBe(4)
  expect(measureQuarterBeats('3/4')).toBe(3)
  expect(measureQuarterBeats('6/8')).toBe(3)
})
it('fills every example measure exactly and rejects incomplete or excessive data', () => {
  RHYTHM_EXAMPLES.forEach(example => {
    expect(example.items.reduce((sum, item) => sum + quarterBeats(item.value, item.dotted), 0)).toBe(example.meter === '4/4' ? 4 : 3)
    expect(() => rhythmMusicXml(example)).not.toThrow()
  })
  expect(() => rhythmMusicXml({ id: 'bad', title: 'bad', kind: 'rhythm', meter: '4/4', items: [{ kind: 'note', value: 'quarter' }] })).toThrow()
  expect(() => rhythmMusicXml({ id: 'bad', title: 'bad', kind: 'rhythm', meter: '3/4', items: [{ kind: 'rest', value: 'whole' }] })).toThrow()
})
it('writes integer MusicXML durations, dots, rests, time and quarter-beat beams', () => {
  const parse = (id: string) => new DOMParser().parseFromString(rhythmMusicXml(RHYTHM_EXAMPLES.find(item => item.id === id)!), 'text/xml')
  const whole = parse('note-whole')
  expect(whole.querySelector('divisions')?.textContent).toBe('2')
  expect(whole.querySelector('duration')?.textContent).toBe('8')
  expect(whole.querySelector('type')?.textContent).toBe('whole')
  const dotted = parse('note-dotted-half')
  expect([...dotted.querySelectorAll('duration')].map(node => node.textContent)).toEqual(['6', '2'])
  expect(dotted.querySelectorAll('dot')).toHaveLength(1)
  const rest = parse('rest-whole')
  expect(rest.querySelector('rest')).not.toBeNull()
  expect(rest.querySelector('rest')?.getAttribute('measure')).toBe('yes')
  expect(rest.querySelector('pitch')).toBeNull()
  const four = parse('meter-four')
  expect([...four.querySelectorAll('beam')].map(node => node.textContent)).toEqual(['begin', 'end', 'begin', 'end', 'begin', 'end', 'begin', 'end'])
  const three = parse('meter-three')
  expect([...three.querySelectorAll('beam')].map(node => node.textContent)).toEqual(['begin', 'end', 'begin', 'end', 'begin', 'end'])
  const six = parse('meter-six')
  expect(six.querySelector('beats')?.textContent).toBe('6')
  expect(six.querySelector('beat-type')?.textContent).toBe('8')
  expect([...six.querySelectorAll('duration')].map(node => node.textContent)).toEqual(['1', '1', '1', '1', '1', '1'])
  expect([...six.querySelectorAll('beam')].map(node => node.textContent)).toEqual(['begin', 'continue', 'end', 'begin', 'continue', 'end'])
})
it('describes every rhythm example with complete literal educational text', () => {
  expect(RHYTHM_EXAMPLES.map(describeRhythm)).toEqual([
    '4분의 4박자예요. 온음표 1개예요. 한 마디의 길이는 4분음표 4개와 같아요.',
    '4분의 4박자예요. 2분음표 2개예요. 한 마디의 길이는 4분음표 4개와 같아요.',
    '4분의 4박자예요. 4분음표 4개예요. 한 마디의 길이는 4분음표 4개와 같아요.',
    '4분의 4박자예요. 8분음표 2개, 4분쉼표 1개, 2분쉼표 1개예요. 한 마디의 길이는 4분음표 4개와 같아요.',
    '4분의 4박자예요. 온쉼표 1개예요. 한 마디의 길이는 4분음표 4개와 같아요.',
    '4분의 4박자예요. 2분쉼표 2개예요. 한 마디의 길이는 4분음표 4개와 같아요.',
    '4분의 4박자예요. 4분쉼표 4개예요. 한 마디의 길이는 4분음표 4개와 같아요.',
    '4분의 4박자예요. 8분쉼표 8개예요. 한 마디의 길이는 4분음표 4개와 같아요.',
    '4분의 4박자예요. 점2분음표 1개, 4분음표 1개예요. 한 마디의 길이는 4분음표 4개와 같아요.',
    '4분의 4박자예요. 점4분음표 1개, 8분음표 1개, 2분음표 1개예요. 한 마디의 길이는 4분음표 4개와 같아요.',
    '4분의 4박자예요. 8분음표 8개예요. 한 마디의 길이는 4분음표 4개와 같아요.',
    '4분의 3박자예요. 8분음표 6개예요. 한 마디의 길이는 4분음표 3개와 같아요.',
    '8분의 6박자예요. 8분음표 6개예요. 한 마디의 길이는 4분음표 3개와 같아요. 8분음표를 3개씩 두 묶음으로 세요.',
  ])
})
it('schedules rests and six-eighth groupings at quarter-note 80 bpm', () => {
  const mixed = rhythmTimeline(RHYTHM_EXAMPLES.find(item => item.id === 'note-eighth')!)
  expect(mixed.events.map(({ startMs, durationMs, midi }) => [startMs, durationMs, midi])).toEqual([[0, 375, 67], [375, 375, 67], [750, 750, null], [1500, 1500, null]])
  expect(mixed.totalMs).toBe(3000)
  const six = rhythmTimeline(RHYTHM_EXAMPLES.find(item => item.id === 'meter-six')!)
  expect(six.events.map(item => item.startMs)).toEqual([0, 375, 750, 1125, 1500, 1875])
  expect(six.totalMs).toBe(2250)
})

it('encodes all supported note and rest lengths without losing dots or numeric meters', () => {
  const expected = [
    [['8', 'whole', false, false]],
    [['4', 'half', false, false], ['4', 'half', false, false]],
    [['2', 'quarter', false, false], ['2', 'quarter', false, false], ['2', 'quarter', false, false], ['2', 'quarter', false, false]],
    [['1', 'eighth', false, false], ['1', 'eighth', false, false], ['2', 'quarter', true, false], ['4', 'half', true, false]],
    [['8', 'whole', true, false]],
    [['4', 'half', true, false], ['4', 'half', true, false]],
    [['2', 'quarter', true, false], ['2', 'quarter', true, false], ['2', 'quarter', true, false], ['2', 'quarter', true, false]],
    [['1', 'eighth', true, false], ['1', 'eighth', true, false], ['1', 'eighth', true, false], ['1', 'eighth', true, false], ['1', 'eighth', true, false], ['1', 'eighth', true, false], ['1', 'eighth', true, false], ['1', 'eighth', true, false]],
    [['6', 'half', false, true], ['2', 'quarter', false, false]],
    [['3', 'quarter', false, true], ['1', 'eighth', false, false], ['4', 'half', false, false]],
  ]
  RHYTHM_EXAMPLES.slice(0, 10).forEach((example, index) => {
    const xml = new DOMParser().parseFromString(rhythmMusicXml(example), 'text/xml')
    expect(xml.querySelector('parsererror')).toBeNull()
    expect(xml.querySelector('time')?.getAttribute('symbol')).toBe('normal')
    expect(xml.querySelector('beats')?.textContent).toBe('4')
    expect(xml.querySelector('beat-type')?.textContent).toBe('4')
    expect([...xml.querySelectorAll('note')].map(node => [node.querySelector('duration')?.textContent, node.querySelector('type')?.textContent, !!node.querySelector('rest'), !!node.querySelector('dot')])).toEqual(expected[index])
  })
})

it('names the eighth-note example and beams its first beat together', () => {
  const example = RHYTHM_EXAMPLES.find(item => item.id === 'note-eighth')!
  expect(example.title).toBe('8분음표')
  const xml = new DOMParser().parseFromString(rhythmMusicXml(example), 'text/xml')
  expect([...xml.querySelectorAll('beam')].map(node => node.textContent)).toEqual(['begin', 'end'])
})

it('accents each beat group differently in three-quarter and six-eighth meter', () => {
  const three = rhythmTimeline(RHYTHM_EXAMPLES.find(item => item.id === 'meter-three')!)
  const six = rhythmTimeline(RHYTHM_EXAMPLES.find(item => item.id === 'meter-six')!)
  const threeVelocities = three.events.map(event => event.velocity)
  const sixVelocities = six.events.map(event => event.velocity)
  expect(threeVelocities).toEqual([0.85, 0.45, 0.65, 0.45, 0.65, 0.45])
  expect(sixVelocities).toEqual([0.85, 0.45, 0.45, 0.65, 0.45, 0.45])
  expect(threeVelocities).not.toEqual(sixVelocities)
  expect(rhythmTimeline(RHYTHM_EXAMPLES.find(item => item.id === 'meter-four')!).events.map(event => event.velocity)).toEqual([0.85, 0.45, 0.65, 0.45, 0.65, 0.45, 0.65, 0.45])
  expect(rhythmTimeline(RHYTHM_EXAMPLES.find(item => item.id === 'note-eighth')!).events.map(event => event.velocity)).toEqual([0.85, 0.45, null, null])
})
