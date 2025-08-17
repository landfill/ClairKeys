'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface ProcessingJob {
  sheetMusicId: number
  jobId: string
  title?: string
}

interface OMRProcessingStatusProps {
  jobs: ProcessingJob[]
  onJobComplete?: (sheetMusicId: number) => void
  onJobError?: (jobId: string, error: string) => void
}

interface JobStatus {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  message: string
  sheetMusic?: any
  error?: string
  lastChecked: number
}

export default function OMRProcessingStatus({ 
  jobs, 
  onJobComplete, 
  onJobError 
}: OMRProcessingStatusProps) {
  const router = useRouter()
  const [jobStatuses, setJobStatuses] = useState<{ [jobId: string]: JobStatus }>({})
  
  // Initialize job statuses
  useEffect(() => {
    const initialStatuses: { [jobId: string]: JobStatus } = {}
    jobs.forEach(job => {
      initialStatuses[job.jobId] = {
        jobId: job.jobId,
        status: 'pending',
        progress: 0,
        message: 'Starting OMR processing...',
        lastChecked: Date.now()
      }
    })
    setJobStatuses(initialStatuses)
  }, [jobs])

  // Poll job statuses
  useEffect(() => {
    if (jobs.length === 0) return

    const pollInterval = setInterval(async () => {
      for (const job of jobs) {
        const currentStatus = jobStatuses[job.jobId]
        
        // Skip if already completed or failed
        if (currentStatus && (currentStatus.status === 'completed' || currentStatus.status === 'failed')) {
          continue
        }

        // Skip if checked recently (avoid too frequent polling)
        if (currentStatus && (Date.now() - currentStatus.lastChecked) < 3000) {
          continue
        }

        try {
          const response = await fetch(`/api/omr/status/${job.jobId}`)
          
          if (!response.ok) {
            throw new Error(`Failed to check status: ${response.statusText}`)
          }

          const statusData = await response.json()
          
          setJobStatuses(prev => ({
            ...prev,
            [job.jobId]: {
              jobId: job.jobId,
              status: statusData.status,
              progress: statusData.progress || 0,
              message: statusData.message || 'Processing...',
              sheetMusic: statusData.sheetMusic,
              error: statusData.error,
              lastChecked: Date.now()
            }
          }))

          // Handle completion
          if (statusData.status === 'completed' && statusData.sheetMusic) {
            if (onJobComplete) {
              onJobComplete(statusData.sheetMusic.id)
            }
          }

          // Handle failure
          if (statusData.status === 'failed') {
            const errorMessage = statusData.error || 'OMR processing failed'
            if (onJobError) {
              onJobError(job.jobId, errorMessage)
            }
          }

        } catch (error) {
          console.error(`Error checking status for job ${job.jobId}:`, error)
          
          setJobStatuses(prev => ({
            ...prev,
            [job.jobId]: {
              jobId: job.jobId,
              status: 'failed',
              progress: 0,
              message: 'Failed to check processing status',
              error: error instanceof Error ? error.message : 'Unknown error',
              lastChecked: Date.now()
            }
          }))

          if (onJobError) {
            onJobError(job.jobId, error instanceof Error ? error.message : 'Unknown error')
          }
        }
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [jobs, jobStatuses, onJobComplete, onJobError])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'processing':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅'
      case 'failed':
        return '❌'
      case 'processing':
        return '🔄'
      default:
        return '⏳'
    }
  }

  const handleViewSheet = (sheetMusicId: number) => {
    router.push(`/sheet/${sheetMusicId}`)
  }

  if (jobs.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      <h3 className="text-xl font-bold mb-4">OMR Processing Status</h3>
      
      <div className="space-y-4">
        {jobs.map(job => {
          const status = jobStatuses[job.jobId]
          const jobTitle = job.title || status?.sheetMusic?.title || 'Processing...'
          
          return (
            <div key={job.jobId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">
                  {getStatusIcon(status?.status || 'pending')} {jobTitle}
                </h4>
                <span className={`text-sm font-medium ${getStatusColor(status?.status || 'pending')}`}>
                  {status?.status?.toUpperCase() || 'PENDING'}
                </span>
              </div>
              
              {status && (
                <>
                  <p className="text-sm text-gray-600 mb-2">
                    {status.message}
                  </p>
                  
                  {status.status !== 'completed' && status.status !== 'failed' && (
                    <div className="mb-2">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{status.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${status.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {status.error && (
                    <p className="text-sm text-red-600 mt-2">
                      Error: {status.error}
                    </p>
                  )}
                  
                  {status.status === 'completed' && status.sheetMusic && (
                    <div className="mt-3">
                      <Button
                        onClick={() => handleViewSheet(status.sheetMusic.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        View & Practice 🎹
                      </Button>
                    </div>
                  )}
                </>
              )}
              
              <div className="mt-2 text-xs text-gray-500">
                Job ID: {job.jobId}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>
            Total jobs: {jobs.length}
          </span>
          <span>
            Completed: {Object.values(jobStatuses).filter(s => s.status === 'completed').length} • 
            Processing: {Object.values(jobStatuses).filter(s => s.status === 'processing' || s.status === 'pending').length} • 
            Failed: {Object.values(jobStatuses).filter(s => s.status === 'failed').length}
          </span>
        </div>
      </div>
    </div>
  )
}