'use client'

import { ReactNode, useState } from 'react'
import { useSession } from 'next-auth/react'

interface SidebarProps {
  children: ReactNode
}

export default function Sidebar({ children }: SidebarProps) {
  const { data: session } = useSession()
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (!session) {
    return null
  }

  return (
    <>
      {/* Mobile overlay */}
      <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" />
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 
        ${isCollapsed ? 'w-16' : 'w-64'} 
        bg-white shadow-lg border-r border-gray-200
        transform transition-all duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        top-16 lg:top-0
      `}>
        {/* Collapse button - desktop only */}
        <div className="hidden lg:block absolute -right-3 top-6 z-10">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
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