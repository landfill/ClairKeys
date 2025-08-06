import { useState, useEffect, useRef, useCallback } from 'react'

export type ProcessingStage = 
  | 'idle'
  | 'queued'
  | 'upload'
  | 'parsing'
  | 'omr'
  | 'validation'
  | 'generation'
  | 'complete'
  | 'error'
  | 'cancelled'

export interface ProcessingStatus {
  sessionId: string
  stage: ProcessingStage
  progress: number
  message: string
  estimatedTime?: number
  startTime: number
  endTime?: number
  error?: string
  completed: boolean
  cancelled: boolean
  result?: any
}

export interface UseRealTimeProcessingOptions {
  onComplete?: (result: any) => void
  onError?: (error: string) => void
  onStageChange?: (stage: ProcessingStage) => void
  pollInterval?: number // Fallback polling interval in ms
}

export interface UseRealTimeProcessingReturn {
  status: ProcessingStatus | null
  isConnected: boolean
  error: string | null
  startProcessing: (file: File, metadata: any) => Promise<void>
  cancelProcessing: () => Promise<void>
  reconnect: () => void
}

export function useRealTimeProcessing(
  options: UseRealTimeProcessingOptions = {}
): UseRealTimeProcessingReturn {
  const {
    onComplete,
    onError,
    onStageChange,
    pollInterval = 2000
  } = options

  const [status, setStatus] = useState<ProcessingStatus | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const currentSessionRef = useRef<string | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    setIsConnected(false)
  }, [])

  // Setup Server-Sent Events connection
  const setupSSEConnection = useCallback((sessionId: string) => {
    cleanup()

    try {
      const eventSource = new EventSource(`/api/processing-status/${sessionId}`, {
        method: 'POST'
      })

      eventSource.onopen = () => {
        console.log(`SSE connected for session: ${sessionId}`)
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'connected') {
            console.log('SSE connection established')
            return
          }

          if (data.type === 'status') {
            const newStatus: ProcessingStatus = {
              sessionId: data.sessionId,
              stage: data.stage,
              progress: data.progress,
              message: data.message,
              estimatedTime: data.estimatedTime,
              startTime: data.startTime,
              endTime: data.endTime,
              error: data.error,
              completed: data.completed || false,
              cancelled: data.cancelled || false,
              result: data.result
            }

            setStatus(prevStatus => {
              // Only call onStageChange if stage actually changed
              if (!prevStatus || prevStatus.stage !== newStatus.stage) {
                onStageChange?.(newStatus.stage)
              }
              return newStatus
            })

            // Handle completion
            if (data.completed && data.result) {
              onComplete?.(data.result)
              cleanup()
            }

            // Handle error
            if (data.error) {
              onError?.(data.error)
              cleanup()
            }
          }

          if (data.type === 'error') {
            console.error('SSE error:', data.message)
            setError(data.message)
            onError?.(data.message)
            cleanup()
          }

        } catch (parseError) {
          console.error('Failed to parse SSE message:', parseError)
        }
      }

      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event)
        setIsConnected(false)
        
        // Try to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`)
          
          setTimeout(() => {
            if (currentSessionRef.current) {
              reconnectAttemptsRef.current++
              setupSSEConnection(currentSessionRef.current)
            }
          }, delay)
        } else {
          console.log('Max reconnection attempts reached, falling back to polling')
          if (currentSessionRef.current) {
            setupPolling(currentSessionRef.current)
          }
        }
      }

      eventSourceRef.current = eventSource

    } catch (error) {
      console.error('Failed to setup SSE connection:', error)
      // Fallback to polling
      setupPolling(sessionId)
    }
  }, [cleanup, onComplete, onError, onStageChange])

  // Fallback polling mechanism
  const setupPolling = useCallback((sessionId: string) => {
    cleanup()

    console.log(`Setting up polling for session: ${sessionId}`)
    setError('실시간 연결 실패 - 폴링으로 전환')

    const poll = async () => {
      try {
        const response = await fetch(`/api/processing-status/${sessionId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            console.log('Session not found, stopping polling')
            cleanup()
            return
          }
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        const newStatus: ProcessingStatus = {
          sessionId: data.sessionId,
          stage: data.stage,
          progress: data.progress,
          message: data.message,
          estimatedTime: data.estimatedTime,
          startTime: data.startTime,
          endTime: data.endTime,
          error: data.error,
          completed: data.completed || false,
          cancelled: data.cancelled || false,
          result: data.result
        }

        setStatus(prevStatus => {
          if (!prevStatus || prevStatus.stage !== newStatus.stage) {
            onStageChange?.(newStatus.stage)
          }
          return newStatus
        })

        // Handle completion
        if (data.completed && data.result) {
          onComplete?.(data.result)
          cleanup()
          return
        }

        // Handle error
        if (data.error) {
          onError?.(data.error)
          cleanup()
          return
        }

      } catch (pollError) {
        console.error('Polling error:', pollError)
        setError(`연결 오류: ${pollError instanceof Error ? pollError.message : 'Unknown error'}`)
      }
    }

    // Initial poll
    poll()

    // Setup interval
    pollTimerRef.current = setInterval(poll, pollInterval)
  }, [cleanup, onComplete, onError, onStageChange, pollInterval])

  // Start processing
  const startProcessing = useCallback(async (file: File, metadata: any) => {
    try {
      setError(null)
      setStatus(null)
      cleanup()

      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', metadata.title)
      formData.append('composer', metadata.composer)
      formData.append('category', metadata.categoryId?.toString() || '')
      formData.append('isPublic', metadata.isPublic.toString())

      // Start async processing
      const response = await fetch('/api/upload-async', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start processing')
      }

      const result = await response.json()
      const sessionId = result.sessionId

      currentSessionRef.current = sessionId
      console.log(`Started processing with session ID: ${sessionId}`)

      // Setup real-time connection
      setupSSEConnection(sessionId)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start processing'
      setError(errorMessage)
      onError?.(errorMessage)
      throw error
    }
  }, [setupSSEConnection, cleanup, onError])

  // Cancel processing
  const cancelProcessing = useCallback(async () => {
    if (!currentSessionRef.current) return

    try {
      const response = await fetch(`/api/processing-status/${currentSessionRef.current}/cancel`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to cancel processing')
      }

      cleanup()
      setStatus(null)
      currentSessionRef.current = null

    } catch (error) {
      console.error('Failed to cancel processing:', error)
      setError(error instanceof Error ? error.message : 'Failed to cancel')
    }
  }, [cleanup])

  // Manual reconnect
  const reconnect = useCallback(() => {
    if (currentSessionRef.current) {
      reconnectAttemptsRef.current = 0
      setupSSEConnection(currentSessionRef.current)
    }
  }, [setupSSEConnection])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    status,
    isConnected,
    error,
    startProcessing,
    cancelProcessing,
    reconnect
  }
}