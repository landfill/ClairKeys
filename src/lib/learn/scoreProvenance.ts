export interface ScoreProvenance { meter?: string; key?: string }

const children = (node: Element, tag: string) => Array.from(node.children).filter(child => child.tagName === tag)
const text = (node: Element, tag: string) => {
  const matches = children(node, tag)
  return matches.length === 1 ? matches[0].textContent?.trim() : undefined
}

function meterValue(node: Element): string | undefined {
  if (node.hasAttribute('number') || children(node, 'senza-misura').length) return undefined
  const beats = text(node, 'beats'), unit = text(node, 'beat-type')
  if (!beats || !unit || !/^\d+$/.test(beats) || !/^\d+$/.test(unit)) return undefined
  if (Number(beats) < 1 || Number(beats) > 32 || ![1, 2, 4, 8, 16, 32, 64].includes(Number(unit))) return undefined
  return `${Number(beats)}/${Number(unit)}`
}
function keyValue(node: Element): string | undefined {
  if (node.hasAttribute('number') || children(node, 'key-step').length || children(node, 'key-alter').length) return undefined
  const fifths = text(node, 'fifths')
  if (!fifths || !/^-?\d+$/.test(fifths) || Math.abs(Number(fifths)) > 7) return undefined
  const value = Number(fifths)
  return value === 0 ? '샵·플랫 없음' : `${value > 0 ? '샵' : '플랫'} ${Math.abs(value)}개`
}

/** Summarize only unambiguous, explicit notation; never read animation defaults. */
export function readScoreProvenance(musicxml: string): ScoreProvenance {
  if (typeof DOMParser === 'undefined' || /<!DOCTYPE|<!ENTITY/i.test(musicxml)) return {}
  const doc = new DOMParser().parseFromString(musicxml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length || doc.documentElement.tagName !== 'score-partwise') return {}
  const parts = children(doc.documentElement, 'part')
  if (!parts.length) return {}
  const result: ScoreProvenance = {}
  for (const [tag, name, read] of [['time', 'meter', meterValue], ['key', 'key', keyValue]] as const) {
    const values = new Set<string>()
    let valid = true
    let notes = 0
    for (const part of parts) {
      let current: string | undefined
      for (const measure of children(part, 'measure')) {
        for (const item of Array.from(measure.children)) {
          if (item.tagName === 'attributes') {
            const definitions = children(item, tag)
            if (definitions.length) {
              current = definitions.length === 1 ? read(definitions[0]) : undefined
              if (!current) valid = false
              else values.add(current)
            }
          } else if (item.tagName === 'note') {
            notes++
            if (!current) valid = false
          }
        }
      }
    }
    if (valid && notes && values.size === 1) result[name] = [...values][0]
  }
  return result
}
