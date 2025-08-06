'use client'

import { AuthGuard } from '@/components/auth'
import { MainLayout } from '@/components/layout'
import ProcessingDashboard from '@/components/processing/ProcessingDashboard'

export default function ProcessingPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <ProcessingDashboard />
        </div>
      </MainLayout>
    </AuthGuard>
  )
}