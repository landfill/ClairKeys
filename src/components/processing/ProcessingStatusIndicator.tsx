'use client'

import { useBackgroundProcessing } from '@/hooks/useBackgroundProcessing'
import { Button } from '@/components/ui'
import { useState } from 'react'

export default function ProcessingStatusIndicator() {
  const { jobs, notifications, isPolling } = useBackgroundProcessing()
  const [isExpanded, setIsExpanded] = useState(false)

  const activeJobs = jobs.filter(job => 
    job.status === 'PENDING' || job.status === 'PROCESSING'
  )
  
  const unreadNotifications = notifications.filter(n => !n.isRead)

  // Don't show if no active jobs or unread notifications
  if (activeJobs.length === 0 && unreadNotifications.length === 0) {
    return null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '⏳'
      case 'PROCESSING':
        return '⚙️'
      default:
        return '📄'
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Compact indicator */}
      {!isExpanded && (
        <div
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center space-x-2">
            {isPolling && (
              <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
            
            {activeJobs.length > 0 && (
              <div className="flex items-center space-x-1">
                <span className="text-sm">⚙️</span>
                <span className="text-sm font-medium text-blue-600">
                  {activeJobs.length}
                </span>
              </div>
            )}
            
            {unreadNotifications.length > 0 && (
              <div className="flex items-center space-x-1">
                <span className="text-sm">🔔</span>
                <span className="text-sm font-medium text-red-600">
                  {unreadNotifications.length}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expanded view */}
      {isExpanded && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">처리 상태</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Active Jobs */}
          {activeJobs.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="text-sm font-medium text-gray-700">진행 중인 작업</h4>
              {activeJobs.map((job) => (
                <div key={job.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span>{getStatusIcon(job.status)}</span>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {job.metadata.title}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {job.progress}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  
                  <p className="text-xs text-gray-600 mt-1">
                    {job.currentStage === 'UPLOAD' && '업로드 중...'}
                    {job.currentStage === 'PARSING' && 'PDF 파싱 중...'}
                    {job.currentStage === 'OMR' && '악보 인식 중...'}
                    {job.currentStage === 'VALIDATION' && '데이터 검증 중...'}
                    {job.currentStage === 'GENERATION' && '애니메이션 생성 중...'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Recent Notifications */}
          {unreadNotifications.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="text-sm font-medium text-gray-700">새 알림</h4>
              {unreadNotifications.slice(0, 3).map((notification) => (
                <div key={notification.id} className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {unreadNotifications.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  +{unreadNotifications.length - 3}개 더
                </p>
              )}
            </div>
          )}

          {/* Action Button */}
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => {
              window.location.href = '/processing'
            }}
          >
            전체 대시보드 보기
          </Button>
        </div>
      )}
    </div>
  )
}