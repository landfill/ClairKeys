'use client'

import { useState } from 'react'
import { AuthGuard } from '@/components/auth'
import { MainLayout } from '@/components/layout'
import { Button, Card } from '@/components/ui'
import { useBackgroundProcessing } from '@/hooks/useBackgroundProcessing'

export default function TestBackgroundProcessingPage() {
  const {
    jobs,
    notifications,
    isLoading,
    error,
    createBackgroundJob,
    cancelJob,
    retryJob,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    isPolling
  } = useBackgroundProcessing()

  const [testFile, setTestFile] = useState<File | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setTestFile(file)
    }
  }

  const handleTestUpload = async () => {
    if (!testFile) return

    try {
      await createBackgroundJob(testFile, {
        title: 'Test Song',
        composer: 'Test Composer',
        isPublic: false
      })
      alert('Background job created successfully!')
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <AuthGuard>
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Background Processing Test
            </h1>

            {/* Test Upload */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Test Upload</h2>
              <div className="space-y-4">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <Button
                  onClick={handleTestUpload}
                  disabled={!testFile}
                >
                  Create Background Job
                </Button>
              </div>
            </Card>

            {/* Status */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Status</h2>
              <div className="space-y-2">
                <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
                <p><strong>Polling:</strong> {isPolling ? 'Yes' : 'No'}</p>
                <p><strong>Jobs:</strong> {jobs.length}</p>
                <p><strong>Notifications:</strong> {notifications.length}</p>
                {error && <p className="text-red-600"><strong>Error:</strong> {error}</p>}
              </div>
            </Card>

            {/* Jobs */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Jobs ({jobs.length})</h2>
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{job.metadata.title}</h3>
                      <span className={`px-2 py-1 rounded text-sm ${
                        job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        job.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                        job.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      File: {job.fileName} | Progress: {job.progress}%
                    </p>
                    {job.error && (
                      <p className="text-sm text-red-600 mb-2">Error: {job.error}</p>
                    )}
                    <div className="flex space-x-2">
                      {(job.status === 'PENDING' || job.status === 'PROCESSING') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelJob(job.id)}
                        >
                          Cancel
                        </Button>
                      )}
                      {job.status === 'FAILED' && (
                        <Button
                          size="sm"
                          onClick={() => retryJob(job.id)}
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {jobs.length === 0 && (
                  <p className="text-gray-500">No jobs found</p>
                )}
              </div>
            </Card>

            {/* Notifications */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Notifications ({notifications.length})</h2>
                {notifications.some(n => !n.isRead) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={markAllNotificationsAsRead}
                  >
                    Mark All Read
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg cursor-pointer ${
                      notification.isRead ? 'bg-gray-50' : 'bg-blue-50 border border-blue-200'
                    }`}
                    onClick={() => {
                      if (!notification.isRead) {
                        markNotificationAsRead(notification.id)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{notification.title}</h4>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <p className="text-gray-500">No notifications found</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  )
}