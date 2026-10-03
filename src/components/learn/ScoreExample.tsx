'use client'

import { useEffect, useRef, useState } from 'react'
import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import { describeExample, exampleMusicXml, type ReadingExample } from '@/lib/learn/reading'

export default function ScoreExample({ example }: { example: ReadingExample }) {
  const host = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  const xml = exampleMusicXml(example)
  const description = describeExample(example)

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
      container.style.width = `${Math.max(160, 90 + example.midis.length * 22)}px`
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
      const left = Math.min(...bounds.map(box => box.x)) - 2
      const top = Math.min(...bounds.map(box => box.y)) - 2
      const artWidth = Math.max(...bounds.map(box => box.x + box.width)) + 2 - left
      const artHeight = Math.max(...bounds.map(box => box.y + box.height)) + 2 - top
      if (!(artWidth > 0 && artHeight > 0)) throw new Error('OSMD score example bounds are empty')
      const scale = Math.min(Math.max(1, frameBox.clientWidth - 24) / artWidth, Math.max(1, frameBox.clientHeight - 24) / artHeight)
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
          drawMeasureNumbers: false, drawTimeSignatures: false, disableCursor: true,
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
  }, [xml, example.midis.length])

  return (
    <figure className="min-w-0" data-example={example.id}>
      <div ref={frameRef} role="img" aria-label={description} aria-busy={status === 'loading'}
        className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded border border-rule bg-surface p-3">
        <div ref={host} aria-hidden="true" data-testid="score-example-svg" className="shrink-0 text-ink" />
        {status !== 'ready' && <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-ink-muted">{status === 'failed' ? '악보 그림을 불러오지 못했어요. 아래 설명을 확인해 주세요.' : '악보 그림을 준비하고 있어요.'}</span>}
      </div>
      <figcaption className="mt-2 text-sm text-ink-muted">{description}</figcaption>
    </figure>
  )
}
