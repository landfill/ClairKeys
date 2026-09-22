'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import type { FallingNote } from '@/types/fallingNotes'
import type { ScoreArtifact } from '@/types/scoreArtifact'
import { isScoreArtifact } from '@/types/scoreArtifact'
import { activeScoreMeasure, annotateScoreFingering } from '@/utils/scoreDisplay'

type MeasureBox = { left: number; top: number; width: number; height: number }
type SystemBox = { top: number; bottom: number; height: number }

export default function ScorePanel({ url, notes, currentTime, timingReferenceBpm, height, onRequiredHeight, contentFits }: {
  url: string; notes: FallingNote[]; currentTime: number; timingReferenceBpm: number
  height?: number; onRequiredHeight?: (height: number) => void; contentFits?: boolean
}) {
  const [artifact, setArtifact] = useState<ScoreArtifact | null>(null)
  const [error, setError] = useState(false)
  const [boxes, setBoxes] = useState<Array<MeasureBox | null>>([])
  const [systems, setSystems] = useState<SystemBox[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const renderRef = useRef<HTMLDivElement>(null)
  const lastSystemRef = useRef<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    lastSystemRef.current = null
    setArtifact(null); setError(false)
    fetch(url, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Score unavailable')
        const data: unknown = await response.json()
        if (!isScoreArtifact(data)) throw new Error('Invalid score')
        if (!controller.signal.aborted) setArtifact(data)
      }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [url])

  useEffect(() => {
    const container = renderRef.current
    if (!artifact || !container) return
    let disposed = false
    let display: OpenSheetMusicDisplay | undefined
    let observer: ResizeObserver | undefined
    let frame = 0
    setBoxes([])
    const draw = () => {
      if (disposed || !display) return
      display.render()
      // A measure box can omit a slur or a fingering on another measure of the
      // same line. Measure the rendered pair of complete staffline groups.
      const origin = container.getBoundingClientRect().top
      const lines = Array.from(container.querySelectorAll<SVGGElement>('g.staffline'))
      const renderedSystems: SystemBox[] = []
      for (let index = 0; index + 1 < lines.length; index += 2) {
        const first = lines[index].getBoundingClientRect()
        const second = lines[index + 1].getBoundingClientRect()
        const top = Math.min(first.top, second.top) - origin
        const bottom = Math.max(first.bottom, second.bottom) - origin
        renderedSystems.push({ top, bottom, height: bottom - top })
      }
      setSystems(renderedSystems)
      if (renderedSystems.length) {
        const chrome = scrollRef.current
          ? scrollRef.current.getBoundingClientRect().height - scrollRef.current.clientHeight
          : 2
        onRequiredHeight?.(Math.ceil(Math.max(...renderedSystems.map(system => system.height)) + 8 + chrome))
      }
      const unit = 10 * display.Zoom
      setBoxes(display.GraphicSheet.MeasureList.map(measures => {
        const bounds = measures.filter(Boolean).map(measure => measure.PositionAndShape)
        if (!bounds.length) return null
        const left = Math.min(...bounds.map(b => b.AbsolutePosition.x + b.BorderLeft)) * unit
        const top = Math.min(...bounds.map(b => b.AbsolutePosition.y + b.BorderTop)) * unit
        const right = Math.max(...bounds.map(b => b.AbsolutePosition.x + b.BorderRight)) * unit
        const bottom = Math.max(...bounds.map(b => b.AbsolutePosition.y + b.BorderBottom)) * unit
        if (![left, top, right, bottom].every(Number.isFinite)) return null
        return { left, top: Math.max(0, top - 8), width: right - left, height: bottom - top + 16 }
      }))
    }
    void (async () => {
      try {
        const { OpenSheetMusicDisplay: Display } = await import('opensheetmusicdisplay')
        if (disposed) return
        display = new Display(container, {
          backend: 'svg', autoResize: false, drawTitle: false, drawComposer: false,
          drawPartNames: false, drawCredits: false, drawFingerings: true,
          fingeringPosition: 'above', disableCursor: true,
          autoGenerateMultipleRestMeasuresFromRestMeasures: false,
        })
        await display.load(annotateScoreFingering(artifact, notes))
        if (disposed) return
        draw()
        let width = container.clientWidth
        observer = new ResizeObserver(() => {
          if (container.clientWidth === width) return
          width = container.clientWidth
          cancelAnimationFrame(frame)
          frame = requestAnimationFrame(() => { try { draw() } catch { setError(true) } })
        })
        observer.observe(container)
      } catch { if (!disposed) setError(true) }
    })()
    return () => {
      disposed = true; observer?.disconnect(); cancelAnimationFrame(frame)
      display?.clear(); container.replaceChildren()
    }
  }, [artifact, notes, onRequiredHeight])

  const measure = useMemo(() => artifact ? activeScoreMeasure(artifact, currentTime, timingReferenceBpm) : -1,
    [artifact, currentTime, timingReferenceBpm])
  const box = boxes[measure]
  useEffect(() => {
    const container = scrollRef.current
    if (!container || !box) return
    const center = box.top + box.height / 2
    const systemIndex = systems.findIndex(row => center >= row.top - 16 && center <= row.bottom + 16)
    const system = systems[systemIndex]
    const systemKey = system ? `${systemIndex}:${Math.round(system.top)}:${Math.round(system.height)}` : null
    const enteringSystem = systemKey !== lastSystemRef.current
    lastSystemRef.current = systemKey
    if (system && system.height + 8 <= container.clientHeight) {
      // When the whole line fits, align its top instead of the highlighted
      // measure: fingering and slurs over neighbouring measures stay visible.
      if (system.top < container.scrollTop || system.bottom > container.scrollTop + container.clientHeight) {
        container.scrollTop = Math.max(0, system.top - 4)
      }
    } else if (system) {
      // If the line exceeds the cap, align its upper notation when entering.
      // Following later measures within that same line would hide the slurs
      // again; let the reader scroll manually and preserve that position.
      if (enteringSystem) container.scrollTop = Math.max(0, system.top - 4)
    } else if (box.top < container.scrollTop || box.top + box.height > container.scrollTop + container.clientHeight) {
      // A system beyond the viewport cap remains scrollable. Keep the current
      // measure available without falsely claiming the entire line can fit.
      container.scrollTop = Math.max(0, box.top - 16)
    }
  }, [box, systems, height])

  return <div ref={scrollRef} data-testid="score-panel"
    aria-label={contentFits === false ? '악보: 한 줄이 높아 세로로 스크롤할 수 있습니다' : '악보'} role="region"
    className="relative w-full overflow-y-auto rounded-xl border bg-white"
    style={{ height: height ?? 'clamp(240px, 34vh, 360px)', flexShrink: 0, marginBottom: 8 }}>
    {error && <p role="alert" className="p-4 text-sm text-ink-muted">악보를 불러오지 못했습니다.</p>}
    <div style={{ position: 'relative', pointerEvents: 'none' }}>
      <div ref={renderRef} aria-hidden="true" />
      {!error && box && <div data-testid="score-measure-highlight" data-measure-index={measure} aria-hidden="true"
        style={{ position: 'absolute', ...box, background: 'rgba(59, 130, 246, 0.18)', pointerEvents: 'none' }} />}
    </div>
  </div>
}
