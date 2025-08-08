'use client'

import { useState, useEffect, useCallback } from 'react'
import { performanceMonitor, PerformanceAlert as IPerformanceAlert } from '@/lib/analytics'
import { Toast } from '@/components/ui/toast'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { AlertTriangle, Bell, BellOff, Settings, X, Zap, TrendingUp, Clock } from 'lucide-react'

interface PerformanceAlertSystemProps {
  className?: string
  enableNotifications?: boolean
  enableSound?: boolean
}

interface AlertSettings {
  enabled: boolean
  soundEnabled: boolean
  criticalThreshold: number
  warningThreshold: number
  maxAlerts: number
  suppressDuration: number // minutes
}

export default function PerformanceAlertSystem({
  className = '',
  enableNotifications = true,
  enableSound = false
}: PerformanceAlertSystemProps) {
  const [alerts, setAlerts] = useState<IPerformanceAlert[]>([])
  const [settings, setSettings] = useState<AlertSettings>({
    enabled: enableNotifications,
    soundEnabled: enableSound,
    criticalThreshold: 3000, // 3 seconds for critical
    warningThreshold: 1000, // 1 second for warning
    maxAlerts: 5,
    suppressDuration: 5 // 5 minutes
  })
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [suppressedUntil, setSuppressedUntil] = useState<number>(0)
  const [showSettings, setShowSettings] = useState(false)

  // Sound setup
  const playAlertSound = useCallback((severity: 'warning' | 'critical') => {
    if (!settings.soundEnabled) return
    
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(context.destination)
      
      // Different tones for different severities
      if (severity === 'critical') {
        oscillator.frequency.setValueAtTime(800, context.currentTime)
        oscillator.frequency.setValueAtTime(400, context.currentTime + 0.1)
        oscillator.frequency.setValueAtTime(800, context.currentTime + 0.2)
      } else {
        oscillator.frequency.setValueAtTime(600, context.currentTime)
      }
      
      gainNode.gain.setValueAtTime(0.3, context.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5)
      
      oscillator.start(context.currentTime)
      oscillator.stop(context.currentTime + 0.5)
    } catch (e) {
      console.warn('Failed to play alert sound:', e)
    }
  }, [settings.soundEnabled])

  // Browser notification
  const sendBrowserNotification = useCallback((alert: IPerformanceAlert) => {
    if (!settings.enabled || !('Notification' in window)) return
    
    if (Notification.permission === 'granted') {
      const notification = new Notification(`Performance Alert: ${alert.metric}`, {
        body: `Value: ${Math.round(alert.value)}ms exceeds threshold of ${alert.threshold}ms`,
        icon: '/favicon.ico',
        tag: `performance-${alert.metric}`, // Prevents duplicate notifications
        requireInteraction: alert.severity === 'critical'
      })
      
      // Auto close after 5 seconds for warnings
      if (alert.severity === 'warning') {
        setTimeout(() => notification.close(), 5000)
      }
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission()
    }
  }, [settings.enabled])

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Subscribe to performance alerts
    const unsubscribe = performanceMonitor.onAlert((alert: IPerformanceAlert) => {
      const now = Date.now()
      
      // Check if alerts are suppressed
      if (now < suppressedUntil) return
      
      // Check if this alert type was recently dismissed
      const alertKey = `${alert.metric}-${alert.severity}`
      if (dismissedAlerts.has(alertKey)) return
      
      setAlerts(prev => {
        const newAlerts = [alert, ...prev.slice(0, settings.maxAlerts - 1)]
        return newAlerts
      })
      
      // Play sound and send notification
      playAlertSound(alert.severity)
      sendBrowserNotification(alert)
    })

    return unsubscribe
  }, [suppressedUntil, dismissedAlerts, settings.maxAlerts, playAlertSound, sendBrowserNotification])

  const dismissAlert = (index: number) => {
    const alert = alerts[index]
    if (alert) {
      const alertKey = `${alert.metric}-${alert.severity}`
      setDismissedAlerts(prev => new Set([...prev, alertKey]))
      
      // Remove from dismissed after suppress duration
      setTimeout(() => {
        setDismissedAlerts(prev => {
          const newSet = new Set(prev)
          newSet.delete(alertKey)
          return newSet
        })
      }, settings.suppressDuration * 60 * 1000)
    }
    
    setAlerts(prev => prev.filter((_, i) => i !== index))
  }

  const suppressAlerts = () => {
    const suppressUntil = Date.now() + (settings.suppressDuration * 60 * 1000)
    setSuppressedUntil(suppressUntil)
    setAlerts([]) // Clear current alerts
  }

  const clearAllAlerts = () => {
    setAlerts([])
  }

  const getAlertIcon = (severity: string) => {
    return severity === 'critical' ? (
      <Zap className="h-4 w-4 text-red-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-yellow-500" />
    )
  }

  const getAlertColor = (severity: string) => {
    return severity === 'critical' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Alert Controls */}
      <Card className="border-blue-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className={`h-5 w-5 ${settings.enabled ? 'text-blue-500' : 'text-gray-400'}`} />
              <CardTitle className="text-lg">Performance Alerts</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              {alerts.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={suppressAlerts}>
                    <BellOff className="h-4 w-4 mr-2" />
                    Suppress ({settings.suppressDuration}m)
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearAllAlerts}>
                    Clear All
                  </Button>
                </>
              )}
            </div>
          </div>
          <CardDescription>
            Real-time performance monitoring and alerting system
          </CardDescription>
        </CardHeader>

        {showSettings && (
          <CardContent className="border-t pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Enable Alerts</label>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(enabled) => setSettings(prev => ({ ...prev, enabled }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Sound Alerts</label>
                <Switch
                  checked={settings.soundEnabled}
                  onCheckedChange={(soundEnabled) => setSettings(prev => ({ ...prev, soundEnabled }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Warning Threshold (ms)</label>
                <Slider
                  value={[settings.warningThreshold]}
                  onValueChange={([warningThreshold]) => 
                    setSettings(prev => ({ ...prev, warningThreshold }))
                  }
                  max={5000}
                  min={100}
                  step={100}
                  className="w-full"
                />
                <div className="text-xs text-gray-500">{settings.warningThreshold}ms</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Critical Threshold (ms)</label>
                <Slider
                  value={[settings.criticalThreshold]}
                  onValueChange={([criticalThreshold]) => 
                    setSettings(prev => ({ ...prev, criticalThreshold }))
                  }
                  max={10000}
                  min={1000}
                  step={500}
                  className="w-full"
                />
                <div className="text-xs text-gray-500">{settings.criticalThreshold}ms</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Suppress Duration (minutes)</label>
                <Slider
                  value={[settings.suppressDuration]}
                  onValueChange={([suppressDuration]) => 
                    setSettings(prev => ({ ...prev, suppressDuration }))
                  }
                  max={60}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="text-xs text-gray-500">{settings.suppressDuration} minutes</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Suppression Status */}
      {suppressedUntil > Date.now() && (
        <Alert className="border-gray-200">
          <BellOff className="h-4 w-4" />
          <AlertTitle>Alerts Suppressed</AlertTitle>
          <AlertDescription>
            Performance alerts are suppressed until{' '}
            {new Date(suppressedUntil).toLocaleTimeString()}
          </AlertDescription>
        </Alert>
      )}

      {/* Active Alerts */}
      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <Alert key={`${alert.metric}-${alert.timestamp}-${index}`} className={getAlertColor(alert.severity)}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {getAlertIcon(alert.severity)}
                <div className="flex-1">
                  <AlertTitle className="flex items-center gap-2">
                    Performance Issue: {alert.metric}
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription className="mt-1">
                    <div className="flex items-center gap-4 text-sm">
                      <span>
                        <strong>Value:</strong> {Math.round(alert.value)}ms
                      </span>
                      <span>
                        <strong>Threshold:</strong> {alert.threshold}ms
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="mt-2 text-xs">
                      <TrendingUp className="h-3 w-3 inline mr-1" />
                      Exceeded by {Math.round(((alert.value - alert.threshold) / alert.threshold) * 100)}%
                    </div>
                  </AlertDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissAlert(index)}
                className="ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Alert>
        ))}
      </div>

      {/* No Alerts State */}
      {alerts.length === 0 && suppressedUntil <= Date.now() && (
        <div className="text-center py-8 text-gray-500">
          <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>No performance alerts</p>
          <p className="text-sm">System is running smoothly</p>
        </div>
      )}
    </div>
  )
}

// Hook for using performance alerts in other components
export function usePerformanceAlerts() {
  const [alerts, setAlerts] = useState<IPerformanceAlert[]>([])

  useEffect(() => {
    setAlerts(performanceMonitor.getAlerts())
    
    const unsubscribe = performanceMonitor.onAlert((alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 9)]) // Keep last 10
    })

    return unsubscribe
  }, [])

  return {
    alerts,
    hasAlerts: alerts.length > 0,
    criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
    warningAlerts: alerts.filter(a => a.severity === 'warning').length
  }
}