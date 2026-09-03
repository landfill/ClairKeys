import React from 'react'
import RootLayout, { viewport } from '../layout'
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
