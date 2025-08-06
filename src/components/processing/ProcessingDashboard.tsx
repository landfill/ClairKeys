'use client'

import { useState } from 'react'
import { Button, Card } from '@/components/ui'
import { useBackgroundProcessing, ProcessingJob } from '@/hooks/useBackgroundProcessing'

export default function ProcessingDashboard() {
  const {
    jobs,
    notifications,
    isLoading,
    error,
    cancelJob,
    retryJob,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    isPolling
  } = useBackgroundProcessing()

  const [activeTab, setActiveTab] = useState<'jobs' | 'notifications'>('jobs')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100'
      case 'PROCESSING':
        return 'text-blue-600 bg-blue-100'
      case 'COMPLETED':
        return 'text-green-600 bg-green-100'
      case 'FAILED':
        return 'text-red-600 bg-red-100'
      case 'CANCELLED':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStageText = (stage: string) => {
    switch (stage) {
      case 'UPLOAD':
        return '업로드'
      case 'PARSING':
        return 'PDF 파싱'
      case 'OMR':
        return '악보 인식'
      case 'VALIDATION':
        return '데이터 검증'
      case 'GENERATION':
        return '애니메이션 생성'
      default:
        return stage
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR')
  }

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length

  if (isLoading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">처리 상태를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">처리 상태 대시보드</h2>
          <p className="text-gray-600 mt-1">
            파일 처리 상태와 알림을 확인하세요
            {isPolling && (
              <span className="ml-2 inline-flex items-center">
                <span className="animate-pulse w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                실시간 업데이트 중
              </span>
            )}
          </p>
        </div>
        
        {unreadNotificationsCount > 0 && (
          <Button
            variant="outline"
            onClick={markAllNotificationsAsRead}
            size="sm"
          >
            모든 알림 읽음 처리 ({unreadNotificationsCount})
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'jobs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            처리 작업 ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-2 px-1 border-b-2 font-medium text-sm relative ${
              activeTab === 'notifications'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            알림 ({notifications.length})
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                처리 중인 작업이 없습니다
              </h3>
              <p className="text-gray-600">
                새 파일을 업로드하면 여기에 처리 상태가 표시됩니다.
              </p>
            </Card>
          ) : (
            jobs.map((job: ProcessingJob) => (
              <Card key={job.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {job.metadata.title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><strong>저작자:</strong> {job.metadata.composer}</p>
                      <p><strong>파일명:</strong> {job.fileName} ({formatFileSize(job.fileSize)})</p>
                      <p><strong>생성일:</strong> {formatDate(job.createdAt)}</p>
                      {job.startedAt && (
                        <p><strong>시작일:</strong> {formatDate(job.startedAt)}</p>
                      )}
                      {job.completedAt && (
                        <p><strong>완료일:</strong> {formatDate(job.completedAt)}</p>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {(job.status === 'PROCESSING' || job.status === 'PENDING') && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">
                            {getStageText(job.currentStage)}
                          </span>
                          <span className="text-gray-600">{job.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {job.error && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800 text-sm">{job.error}</p>
                        {job.retryCount > 0 && (
                          <p className="text-red-600 text-xs mt-1">
                            재시도 횟수: {job.retryCount}/{job.maxRetries}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Success Result */}
                    {job.status === 'COMPLETED' && job.result?.sheetMusic && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800 text-sm">
                          ✅ 처리가 완료되었습니다!
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            window.location.href = `/sheet/${job.result.sheetMusic.id}`
                          }}
                        >
                          악보 보기
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2 ml-4">
                    {(job.status === 'PENDING' || job.status === 'PROCESSING') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelJob(job.id)}
                      >
                        취소
                      </Button>
                    )}
                    
                    {job.status === 'FAILED' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => retryJob(job.id)}
                      >
                        재시도
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-4xl mb-4">🔔</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                알림이 없습니다
              </h3>
              <p className="text-gray-600">
                파일 처리 상태에 대한 알림이 여기에 표시됩니다.
              </p>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 cursor-pointer transition-colors ${
                  notification.isRead ? 'bg-white' : 'bg-blue-50 border-blue-200'
                }`}
                onClick={() => {
                  if (!notification.isRead) {
                    markNotificationAsRead(notification.id)
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-gray-900">
                        {notification.title}
                      </h4>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-gray-700 text-sm mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{formatDate(notification.createdAt)}</span>
                      {notification.job && (
                        <>
                          <span>•</span>
                          <span>{notification.job.fileName}</span>
                          {notification.job.status === 'PROCESSING' && (
                            <>
                              <span>•</span>
                              <span>{notification.job.progress}%</span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}