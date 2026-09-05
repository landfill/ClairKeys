'use client'

import { useId } from 'react'
import { quarterBpm, TEMPO_UNITS, type TempoUnit } from '@/utils/tempoInput'

interface Props {
  value: string
  unit: TempoUnit
  onChange: (value: string) => void
  onUnitChange: (unit: TempoUnit) => void
  disabled?: boolean
  error?: string
  editing?: boolean
}

export default function TempoInput({ value, unit, onChange, onUnitChange, disabled, error, editing }: Props) {
  const id = useId()
  const multiplier = TEMPO_UNITS[unit].multiplier
  let bpm: number | null = null
  try { bpm = quarterBpm(value, unit) } catch { /* Parent validates on submit. */ }
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">빠르기 (BPM)</label>
      <div className="flex gap-2">
        <input id={id} type="text" inputMode="decimal" value={value}
          onChange={event => onChange(event.target.value)} disabled={disabled}
          placeholder={editing ? '기존 빠르기 유지' : '자동 인식'}
          aria-describedby={`${id}-help`} aria-invalid={Boolean(error)}
          className="min-w-0 flex-1 rounded-2xl border border-rule-strong bg-surface px-3 py-2 text-ink" />
        <select aria-label="박 단위" value={unit} disabled={disabled}
          onChange={event => onUnitChange(event.target.value as TempoUnit)}
          className="rounded-2xl border border-rule-strong bg-surface px-2 text-ink">
          {Object.entries(TEMPO_UNITS).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}
        </select>
      </div>
      <input type="range" aria-label="빠르기 슬라이더" min={20 / multiplier} max={400 / multiplier}
        step="any" value={bpm === null ? 60 / multiplier : bpm / multiplier} disabled={disabled}
        onChange={event => onChange(String(Math.max(20, Math.min(400, Math.round(Number(event.target.value) * multiplier))) / multiplier))}
        className="mt-3 w-full accent-accent" />
      <p id={`${id}-help`} className="mt-1 text-xs text-ink-muted">
        {editing ? '비워두면 기존 빠르기를 유지합니다. 입력하면 곡 전체의 재생 속도가 바뀝니다.'
          : '선택 입력입니다. 비워두면 악보의 빠르기를 자동으로 읽습니다. 읽지 못한 경우에만 미상으로 표시됩니다.'}
        {' '}악보의 숫자와 음표 단위를 함께 선택해 주세요.
      </p>
      {bpm !== null && <p className="mt-1 text-xs text-ink-muted">4분음표 기준 ♩={Number(bpm.toFixed(3))}</p>}
      {error && <p role="alert" className="mt-1 text-sm text-state-error">{error}</p>}
    </div>
  )
}
