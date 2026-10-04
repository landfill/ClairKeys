'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import { describeRhythm, rhythmMusicXml, type RhythmExample } from '@/lib/learn/rhythm'
import { describeExample, exampleMusicXml, type ReadingExample } from '@/lib/learn/reading'

export default function ScoreExample({ example }: { example: ReadingExample | RhythmExample }) {
  const captionId = useId()
  const host = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  const rhythm = 'meter' in example
  const xml = rhythm ? rhythmMusicXml(example) : exampleMusicXml(example)
  const description = rhythm ? describeRhythm(example) : describeExample(example)
  const itemCount = rhythm ? example.items.length : example.midis.length

  useEffect(() => {
    const container = host.current
    const frameBox = frameRef.current
    if (!container || !frameBox) return
    let disposed = false
    let display: OpenSheetMusicDisplay | undefined
    let observer: ResizeObserver | undefined
    let frame = 0
    setStatus('loading')
    const failed = (error: unknown) => {
      if (disposed) return
      console.warn('Reading score example unavailable:', error)
      container.replaceChildren()
      setStatus('failed')
    }
    const draw = () => {
      if (disposed || !display) return
      // 음 개수에 맞춘 폭으로 한 마디를 그린 뒤, 실제 그림을 상자에 맞게 확대한다.
      container.style.width = `${Math.max(160, 90 + itemCount * 22)}px`
      display.render()
      const svg = container.querySelector('svg')
      if (!svg) throw new Error('OSMD score example SVG is missing')

      // 페이지 여백 대신 음표·음자리표·덧줄을 포함한 실제 오선 그룹의 경계를 쓴다.
      const groups = [...svg.querySelectorAll<SVGGraphicsElement>('g.staffline')]
      const rootMatrix = svg.getCTM?.()
      const bounds = groups.map(group => {
        const box = group.getBBox()
        const matrix = group.getCTM()
        if (!rootMatrix || !matrix) return box
        const transform = rootMatrix.inverse().multiply(matrix)
        const corners = [
          new DOMPoint(box.x, box.y), new DOMPoint(box.x + box.width, box.y),
          new DOMPoint(box.x, box.y + box.height), new DOMPoint(box.x + box.width, box.y + box.height),
        ].map(point => point.matrixTransform(transform))
        const x = Math.min(...corners.map(point => point.x))
        const y = Math.min(...corners.map(point => point.y))
        return { x, y, width: Math.max(...corners.map(point => point.x)) - x, height: Math.max(...corners.map(point => point.y)) - y }
      })
      if (!bounds.length) bounds.push(svg.getBBox())
      const drawingLeft = Math.min(...bounds.map(box => box.x))
      const drawingTop = Math.min(...bounds.map(box => box.y))
      const drawingWidth = Math.max(...bounds.map(box => box.x + box.width)) - drawingLeft
      const drawingHeight = Math.max(...bounds.map(box => box.y + box.height)) - drawingTop
      if (!(drawingWidth > 0 && drawingHeight > 0)) throw new Error('OSMD score example bounds are empty')
      const availableWidth = Math.max(1, frameBox.clientWidth - 24)
      const availableHeight = Math.max(1, frameBox.clientHeight - 24)
      // 사방 8 SVG 단위: 엔진별 경계 차이와 선 두께를 덮는다.
      // 축소 시에도 4 화면 px를 확보하도록, 양쪽 여백을 뺀 크기로 역산한다.
      const screenPadding = 4
      const padding = Math.max(8,
        screenPadding * drawingWidth / Math.max(1, availableWidth - screenPadding * 2),
        screenPadding * drawingHeight / Math.max(1, availableHeight - screenPadding * 2))
      const left = drawingLeft - padding
      const top = drawingTop - padding
      const artWidth = drawingWidth + padding * 2
      const artHeight = drawingHeight + padding * 2
      const scale = Math.min(availableWidth / artWidth, availableHeight / artHeight)
      const width = artWidth * scale
      const height = artHeight * scale
      svg.setAttribute('viewBox', `${left} ${top} ${artWidth} ${artHeight}`)
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
      svg.style.width = `${width}px`
      svg.style.height = `${height}px`
      svg.style.display = 'block'
      container.style.width = `${width}px`
      container.style.height = `${height}px`
      // 백엔드의 고정 페이지 크기도 맞춰 그림을 상자 가운데에 놓는다.
      for (let parent = svg.parentElement; parent && parent !== container; parent = parent.parentElement) {
        parent.style.width = '100%'
        parent.style.height = '100%'
      }
    }
    void (async () => {
      try {
        const { OpenSheetMusicDisplay: Display } = await import('opensheetmusicdisplay')
        if (disposed) return
        display = new Display(container, {
          backend: 'svg', autoResize: false, drawingParameters: 'compacttight',
          drawTitle: false, drawComposer: false, drawPartNames: false, drawCredits: false,
          drawMeasureNumbers: false, drawTimeSignatures: rhythm, disableCursor: true,
          autoGenerateMultipleRestMeasuresFromRestMeasures: false,
          defaultColorMusic: getComputedStyle(container).color,
        })
        display.Zoom = 1
        await display.load(xml)
        if (disposed) return
        draw()
        setStatus('ready')
        let width = frameBox.clientWidth
        observer = new ResizeObserver(() => {
          if (disposed || width === frameBox.clientWidth) return
          width = frameBox.clientWidth
          cancelAnimationFrame(frame)
          frame = requestAnimationFrame(() => {
            if (disposed) return
            try { draw() } catch (error) { failed(error) }
          })
        })
        observer.observe(frameBox)
      } catch (error) { failed(error) }
    })()
    return () => {
      disposed = true
      observer?.disconnect()
      cancelAnimationFrame(frame)
      try { display?.clear() } catch (error) { console.warn('Reading score cleanup failed:', error) }
      container.replaceChildren()
    }
  }, [xml, itemCount, rhythm])

  return (
    <figure className="min-w-0" data-example={example.id} aria-label={`${example.title} 예시`} aria-describedby={captionId}>
      <div ref={frameRef} role="img" aria-label={`${example.title} 악보`} aria-busy={status === 'loading'}
        className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded border border-rule bg-surface p-3">
        <div ref={host} aria-hidden="true" data-testid="score-example-svg" className="shrink-0 text-ink" />
        {status !== 'ready' && <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-ink-muted">{status === 'failed' ? '악보 그림을 불러오지 못했어요. 아래 설명을 확인해 주세요.' : '악보 그림을 준비하고 있어요.'}</span>}
      </div>
      <figcaption id={captionId} className="mt-2 text-sm text-ink-muted">{description}</figcaption>
    </figure>
  )
}
