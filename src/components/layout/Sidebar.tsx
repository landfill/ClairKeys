'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface SidebarProps {
  children: ReactNode
  isCollapsed?: boolean
  onCollapseChange?: (collapsed: boolean) => void
}

export default function Sidebar({ children, isCollapsed: externalCollapsed, onCollapseChange }: SidebarProps) {
  const { data: session } = useSession()
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  
  // 외부에서 제어되는 경우 외부 상태 사용, 아니면 내부 상태 사용
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed

  // collapse 상태 변경시 부모 컴포넌트에 알림
  useEffect(() => {
    if (externalCollapsed === undefined) {
      onCollapseChange?.(internalCollapsed)
    }
  }, [internalCollapsed, onCollapseChange, externalCollapsed])

  const handleToggleCollapse = () => {
    if (externalCollapsed !== undefined) {
      // 외부 제어 상태인 경우 부모에게 토글 요청
      onCollapseChange?.(!externalCollapsed)
    } else {
      // 내부 제어 상태인 경우 직접 토글
      setInternalCollapsed(!internalCollapsed)
    }
  }

  if (!session) {
    return null
  }

  return (
    <>
      {/* Mobile overlay - 모바일에서만 표시하고 사이드바가 열려있을 때만 표시 */}
      <div 
        className={`
          lg:hidden fixed inset-0 z-40 bg-black overlay-transition
          ${!isCollapsed ? 'bg-opacity-50 pointer-events-auto' : 'bg-opacity-0 pointer-events-none'}
        `}
        onClick={() => {
          if (externalCollapsed !== undefined) {
            onCollapseChange?.(true)
          } else {
            setInternalCollapsed(true)
          }
        }}
      />
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 
        ${isCollapsed ? 'w-16' : 'w-64'} 
        bg-white shadow-lg border-r border-gray-200
        sidebar-transition transform transition-all duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}
        top-0
      `}>
        {/* Collapse button - desktop only */}
        <div className="hidden lg:block absolute -right-3 top-6 z-10">
          <button
            onClick={handleToggleCollapse}
            className="bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:shadow-md transition-shadow"
          >
            <svg
              className={`w-4 h-4 text-gray-600 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Sidebar content */}
        <div className="h-full overflow-y-auto py-4">
          <div className={`px-4 ${isCollapsed ? 'px-2' : ''}`}>
            {children}
          </div>
        </div>
      </div>
    </>
  )
}