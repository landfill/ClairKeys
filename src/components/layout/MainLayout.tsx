'use client'

import { ReactNode } from 'react'
import Sidebar from './Sidebar'

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
  return (
    <div className="flex">
      {showSidebar && (
        <Sidebar>
          {sidebarContent}
        </Sidebar>
      )}
      <main className={`flex-1 ${showSidebar ? 'lg:ml-64' : ''}`}>
        {children}
      </main>
    </div>
  )
}