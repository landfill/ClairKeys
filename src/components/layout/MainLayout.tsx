'use client'

import { ReactNode } from 'react'
import ProcessingStatusIndicator from '@/components/processing/ProcessingStatusIndicator'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ 
  children
}: MainLayoutProps) {
  return (
    <div className="min-h-screen">
      <main className="flex-1">
        {children}
      </main>
      <ProcessingStatusIndicator />
    </div>
  )
}