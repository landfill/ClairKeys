import React from 'react'
import RootLayout, { metadata, viewport } from '../layout'
import manifest from '../../../public/manifest.json'
import MainLayout from '@/components/layout/MainLayout'

jest.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' })
}))

jest.mock('@/components/providers/SessionProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children
}))

jest.mock('@/components/layout/Header', () => ({
  __esModule: true,
  default: () => null
}))

jest.mock('@/components/layout/Footer', () => ({
  __esModule: true,
  default: () => null
}))

describe('RootLayout accessibility contract', () => {
  it('keeps browser zoom available', () => {
    expect(viewport).not.toHaveProperty('maximumScale')
    expect(viewport).not.toHaveProperty('userScalable')
  })

  it('contains one main landmark', () => {
    const tree = RootLayout({ children: <div>Page</div> })
    const body = React.Children.toArray(tree.props.children).find(
      child => React.isValidElement(child) && child.type === 'body'
    )
    if (!React.isValidElement<{ children?: React.ReactNode }>(body)) {
      throw new Error('Root layout body was not rendered')
    }

    const provider = body.props.children
    if (!React.isValidElement<{ children?: React.ReactNode }>(provider)) {
      throw new Error('Session provider was not rendered')
    }

    const landmarks = React.Children.toArray(provider.props.children).filter(
      child => React.isValidElement(child) && child.type === 'main'
    )

    expect(landmarks).toHaveLength(1)
  })

  it('keeps one main landmark when a page uses the shared MainLayout', () => {
    const page = MainLayout({ children: <div>Page</div> })
    const tree = RootLayout({ children: page })

    function countMainLandmarks(node: React.ReactNode): number {
      if (Array.isArray(node)) {
        return node.reduce((count, child) => count + countMainLandmarks(child), 0)
      }
      if (!React.isValidElement<{ children?: React.ReactNode }>(node)) {
        return 0
      }

      return (node.type === 'main' ? 1 : 0) + countMainLandmarks(node.props.children)
    }

    expect(countMainLandmarks(tree)).toBe(1)
  })
})

describe('Product description claims', () => {
  // 악보 변환은 Audiveris OMR 엔진이 한다. 서비스에 AI 기능이 없으므로 AI를 내세우지 않는다.
  it('does not advertise AI in page metadata or the PWA manifest', () => {
    const texts = [metadata.title, metadata.description, manifest.name, manifest.description]
    for (const text of texts) {
      expect(String(text)).not.toMatch(/\bAI\b/)
    }
  })

  it('names the app by its keyboard animation and keeps metadata and manifest in sync', () => {
    expect(metadata.title).toBe('ClairKeys - 따라 치는 건반 애니메이션')
    expect(manifest.name).toBe(metadata.title)
    expect(manifest.description).toBe(metadata.description)
  })
})
