'use client'

import { ReactNode, useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import ProcessingStatusIndicator from '@/components/processing/ProcessingStatusIndicator'

interface MainLayoutProps {
  children: ReactNode
  showSidebar?: boolean
  sidebarContent?: ReactNode
}

export default function MainLayout({ 
  children, 
  showSidebar = false, 
  sidebarContent 
}: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true) // 모바일에서 기본적으로 닫힌 상태

  // 사이드바 collapse 상태 변경 핸들러
  const handleSidebarCollapseChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed)
  }

  // 모바일에서 사이드바 토글
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <div className="flex min-h-screen">
      {showSidebar && (
        <Sidebar 
          isCollapsed={sidebarCollapsed}
          onCollapseChange={handleSidebarCollapseChange}
        >
          {sidebarContent}
        </Sidebar>
      )}
      <main className={`
        flex-1 transition-all duration-300 ease-in-out
        ${showSidebar ? (sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64') : ''}
      `}>
        {/* 모바일 메뉴 버튼 */}
        {showSidebar && (
          <button
            onClick={toggleSidebar}
            className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-md border border-gray-200"
            aria-label="메뉴 열기"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        {children}
      </main>
      <ProcessingStatusIndicator />
    </div>
  )
}