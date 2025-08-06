'use client'

import { useState, useEffect, useCallback } from 'react'

export interface ProcessingJob {
  id: string
  fileName: string
  fileSize: number
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  currentStage: 'UPLOAD' | 'PARSING' | 'OMR' | 'VALIDATION' | 'GENERATION'
  progress: number
  metadata: {
    title: string
    composer: string
    categoryId?: number | null
    isPublic: boolean
  }
  result?: any
  error?: string
  retryCount: number
  maxRetries: number
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  notifications?: ProcessingNotification[]
}

export interface ProcessingNotification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  job?: {
    fileName: string
    status: string
    progress: number
  }
}

export interface BackgroundProcessingState {
  jobs: ProcessingJob[]
  notifications: ProcessingNotification[]
  isLoading: boolean
  error: string | null
}

export function useBackgroundProcessing() {
  const [state, setState] = useState<BackgroundProcessingState>({
    jobs: [],
    notifications: [],
    isLoading: false,
    error: null
  })

  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // Fetch processing jobs
  const fetchJobs = useCallback(async (limit = 10) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await fetch(`/api/processing?limit=${limit}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch processing jobs')
      }

      const data = await response.json()
      
      setState(prev => ({
        ...prev,
        jobs: data.jobs || [],
        isLoading: false
      }))

      return data.jobs

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))
      return []
    }
  }, [])

  // Fetch notifications
  const fetchNotifications = useCallback(async (limit = 20) => {
    try {
      const response = await fetch(`/api/notifications?limit=${limit}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data = await response.json()
      
      setState(prev => ({
        ...prev,
        notifications: data.notifications || []
      }))

      return data.notifications

    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      return []
    }
  }, [])

  // Get specific job status
  const getJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/processing/${jobId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch job status')
      }

      const data = await response.json()
      return data.job

    } catch (error) {
      console.error('Failed to fetch job status:', error)
      return null
    }
  }, [])

  // Create background processing job
  const createBackgroundJob = useCallback(async (
    file: File,
    metadata: {
      title: string
      composer: string
      category?: string
      categoryId?: number | null
      isPublic?: boolean
    }
  ) => {
    try {
      setState(prev => ({ ...prev, error: null }))

      // Validate inputs
      if (!file) {
        throw new Error('No file provided')
      }

      if (!metadata.title.trim()) {
        throw new Error('Title is required')
      }

      if (!metadata.composer.trim()) {
        throw new Error('Composer is required')
      }

      // Create FormData
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', metadata.title.trim())
      formData.append('composer', metadata.composer.trim())
      
      if (metadata.categoryId) {
        formData.append('category', metadata.categoryId.toString())
      } else if (metadata.category) {
        formData.append('category', metadata.category)
      }
      
      formData.append('isPublic', String(metadata.isPublic || false))

      const response = await fetch('/api/processing', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Upload failed: ${response.status}`)
      }

      const result = await response.json()

      // Refresh jobs list
      await fetchJobs()
      await fetchNotifications()

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        error: errorMessage
      }))
      throw error
    }
  }, [fetchJobs, fetchNotifications])

  // Cancel job
  const cancelJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/processing/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'cancel' }),
      })

      if (!response.ok) {
        throw new Error('Failed to cancel job')
      }

      // Refresh jobs list
      await fetchJobs()
      await fetchNotifications()

      return true

    } catch (error) {
      console.error('Failed to cancel job:', error)
      return false
    }
  }, [fetchJobs, fetchNotifications])

  // Retry job
  const retryJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/processing/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'retry' }),
      })

      if (!response.ok) {
        throw new Error('Failed to retry job')
      }

      // Refresh jobs list
      await fetchJobs()
      await fetchNotifications()

      return true

    } catch (error) {
      console.error('Failed to retry job:', error)
      return false
    }
  }, [fetchJobs, fetchNotifications])

  // Mark notification as read
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
      })

      if (response.ok) {
        // Update local state
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(notification =>
            notification.id === notificationId
              ? { ...notification, isRead: true }
              : notification
          )
        }))
      }

      return response.ok

    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      return false
    }
  }, [])

  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
      })

      if (response.ok) {
        // Update local state
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(notification => ({
            ...notification,
            isRead: true
          }))
        }))
      }

      return response.ok

    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      return false
    }
  }, [])

  // Start polling for active jobs
  const startPolling = useCallback(() => {
    if (pollingInterval) return

    const interval = setInterval(async () => {
      const jobs = await fetchJobs()
      const hasActiveJobs = jobs.some((job: ProcessingJob) => 
        job.status === 'PENDING' || job.status === 'PROCESSING'
      )

      if (!hasActiveJobs) {
        stopPolling()
      }

      await fetchNotifications()
    }, 2000) // Poll every 2 seconds

    setPollingInterval(interval)
  }, [pollingInterval, fetchJobs, fetchNotifications])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
  }, [pollingInterval])

  // Auto-start polling when there are active jobs
  useEffect(() => {
    const hasActiveJobs = state.jobs.some(job => 
      job.status === 'PENDING' || job.status === 'PROCESSING'
    )

    if (hasActiveJobs && !pollingInterval) {
      startPolling()
    } else if (!hasActiveJobs && pollingInterval) {
      stopPolling()
    }
  }, [state.jobs, pollingInterval, startPolling, stopPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  // Initial data fetch
  useEffect(() => {
    fetchJobs()
    fetchNotifications()
  }, [fetchJobs, fetchNotifications])

  return {
    ...state,
    fetchJobs,
    fetchNotifications,
    getJobStatus,
    createBackgroundJob,
    cancelJob,
    retryJob,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    startPolling,
    stopPolling,
    isPolling: !!pollingInterval
  }
}