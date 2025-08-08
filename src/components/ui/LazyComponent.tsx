'use client'

import { lazy, Suspense, ComponentType, useState, useEffect, useRef } from 'react'
import Loading from './Loading'

/**
 * 레이지 로딩 래퍼 컴포넌트
 * 컴포넌트를 동적으로 로드하여 초기 번들 크기를 줄입니다
 */
interface LazyComponentProps {
  fallback?: React.ComponentType
  children: React.ReactNode
}

export function LazyWrapper({ 
  fallback: Fallback = Loading, 
  children 
}: LazyComponentProps) {
  return (
    <Suspense fallback={<Fallback />}>
      {children}
    </Suspense>
  )
}

/**
 * 동적 import를 위한 헬퍼 함수
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
): React.ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(importFunc)
  
  return function WrappedLazyComponent(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback ? <fallback /> : <Loading />}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

// 주요 컴포넌트들을 레이지 로딩으로 래핑
export const LazyPianoKeyboard = createLazyComponent(
  () => import('@/components/piano/PianoKeyboard')
)

export const LazyAnimationPlayer = createLazyComponent(
  () => import('@/components/animation/AnimationPlayer')
)

export const LazyFileUpload = createLazyComponent(
  () => import('@/components/upload/FileUpload')
)

export const LazyProcessingDashboard = createLazyComponent(
  () => import('@/components/processing/ProcessingDashboard')
)

export const LazySheetMusicSearch = createLazyComponent(
  () => import('@/components/search/SheetMusicSearch')
)

export const LazyPublicSheetMusicBrowser = createLazyComponent(
  () => import('@/components/browse/PublicSheetMusicBrowser')
)

export const LazyAdvancedPlaybackControls = createLazyComponent(
  () => import('@/components/playback/AdvancedPlaybackControls')
)

export const LazyCategoryManager = createLazyComponent(
  () => import('@/components/category/CategoryManager')
)

/**
 * 조건부 레이지 로딩 컴포넌트
 */
interface ConditionalLazyProps {
  condition: boolean
  component: () => Promise<{ default: ComponentType<any> }>
  fallback?: React.ComponentType
  props?: any
}

export function ConditionalLazy({ 
  condition, 
  component, 
  fallback = Loading,
  props = {} 
}: ConditionalLazyProps) {
  if (!condition) return null
  
  const LazyComponent = lazy(component)
  
  return (
    <Suspense fallback={<fallback />}>
      <LazyComponent {...props} />
    </Suspense>
  )
}

/**
 * 뷰포트에 진입했을 때만 로드하는 컴포넌트
 */
interface ViewportLazyProps {
  component: () => Promise<{ default: ComponentType<any> }>
  fallback?: React.ComponentType
  threshold?: number
  rootMargin?: string
  props?: any
}

export function ViewportLazy({
  component,
  fallback = Loading,
  threshold = 0.1,
  rootMargin = '100px',
  props = {}
}: ViewportLazyProps) {
  const [isInView, setIsInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )
    
    if (ref.current) {
      observer.observe(ref.current)
    }
    
    return () => observer.disconnect()
  }, [threshold, rootMargin])
  
  if (!isInView) {
    return <div ref={ref} className="min-h-[200px]" />
  }
  
  const LazyComponent = lazy(component)
  
  return (
    <div ref={ref}>
      <Suspense fallback={<fallback />}>
        <LazyComponent {...props} />
      </Suspense>
    </div>
  )
}