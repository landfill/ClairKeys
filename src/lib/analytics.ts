'use client'

import { getCLS, getFCP, getFID, getLCP, getTTFB, Metric } from 'web-vitals'

interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
  id: string
  navigationType?: string
  delta?: number
}

interface PerformanceAlert {
  metric: string
  value: number
  threshold: number
  severity: 'warning' | 'critical'
  timestamp: number
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetric[] = []
  private alerts: PerformanceAlert[] = []
  private listeners: ((metric: PerformanceMetric) => void)[] = []
  private alertListeners: ((alert: PerformanceAlert) => void)[] = []
  
  // Performance thresholds (in milliseconds)
  private thresholds = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 }
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebVitals()
      this.startPerformanceObserver()
    }
  }

  private initializeWebVitals() {
    // Measure Core Web Vitals
    getCLS(this.onMetric.bind(this), { reportAllChanges: false })
    getFID(this.onMetric.bind(this))
    getFCP(this.onMetric.bind(this))
    getLCP(this.onMetric.bind(this), { reportAllChanges: false })
    getTTFB(this.onMetric.bind(this))
  }

  private onMetric(metric: Metric) {
    const performanceMetric: PerformanceMetric = {
      name: metric.name,
      value: metric.value,
      rating: this.getRating(metric.name, metric.value),
      timestamp: Date.now(),
      id: metric.id,
      navigationType: metric.navigationType,
      delta: metric.delta
    }

    this.metrics.push(performanceMetric)
    this.checkThresholds(performanceMetric)
    this.notifyListeners(performanceMetric)
    this.persistMetric(performanceMetric)
  }

  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = this.thresholds[name as keyof typeof this.thresholds]
    if (!threshold) return 'good'
    
    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'needs-improvement'
    return 'poor'
  }

  private checkThresholds(metric: PerformanceMetric) {
    const threshold = this.thresholds[metric.name as keyof typeof this.thresholds]
    if (!threshold) return

    let alert: PerformanceAlert | null = null

    if (metric.value > threshold.poor) {
      alert = {
        metric: metric.name,
        value: metric.value,
        threshold: threshold.poor,
        severity: 'critical',
        timestamp: Date.now()
      }
    } else if (metric.value > threshold.good) {
      alert = {
        metric: metric.name,
        value: metric.value,
        threshold: threshold.good,
        severity: 'warning',
        timestamp: Date.now()
      }
    }

    if (alert) {
      this.alerts.push(alert)
      this.notifyAlertListeners(alert)
    }
  }

  private startPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      // Monitor navigation timing
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming
              this.processNavigationTiming(navEntry)
            } else if (entry.entryType === 'resource') {
              this.processResourceTiming(entry as PerformanceResourceTiming)
            }
          }
        })

        observer.observe({ entryTypes: ['navigation', 'resource'] })
      } catch (e) {
        console.warn('PerformanceObserver not fully supported')
      }
    }
  }

  private processNavigationTiming(entry: PerformanceNavigationTiming) {
    const metrics = {
      'DNS-Lookup': entry.domainLookupEnd - entry.domainLookupStart,
      'TCP-Connection': entry.connectEnd - entry.connectStart,
      'SSL-Handshake': entry.secureConnectionStart ? entry.connectEnd - entry.secureConnectionStart : 0,
      'Server-Response': entry.responseEnd - entry.requestStart,
      'DOM-Parse': entry.domContentLoadedEventEnd - entry.responseEnd,
      'Resource-Load': entry.loadEventEnd - entry.domContentLoadedEventEnd
    }

    Object.entries(metrics).forEach(([name, value]) => {
      if (value > 0) {
        const metric: PerformanceMetric = {
          name,
          value,
          rating: value > 1000 ? 'poor' : value > 500 ? 'needs-improvement' : 'good',
          timestamp: Date.now(),
          id: `${name}-${Date.now()}`
        }
        this.metrics.push(metric)
        this.notifyListeners(metric)
      }
    })
  }

  private processResourceTiming(entry: PerformanceResourceTiming) {
    // Track slow resources
    const duration = entry.duration
    if (duration > 2000) { // Resources taking more than 2 seconds
      const alert: PerformanceAlert = {
        metric: 'Slow-Resource',
        value: duration,
        threshold: 2000,
        severity: 'warning',
        timestamp: Date.now()
      }
      this.alerts.push(alert)
      this.notifyAlertListeners(alert)
    }
  }

  private persistMetric(metric: PerformanceMetric) {
    try {
      const stored = localStorage.getItem('performance-metrics')
      const metrics = stored ? JSON.parse(stored) : []
      metrics.push(metric)
      
      // Keep only last 100 metrics
      if (metrics.length > 100) {
        metrics.splice(0, metrics.length - 100)
      }
      
      localStorage.setItem('performance-metrics', JSON.stringify(metrics))
    } catch (e) {
      console.warn('Failed to persist performance metric')
    }
  }

  public onMetricUpdate(callback: (metric: PerformanceMetric) => void) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback)
    }
  }

  public onAlert(callback: (alert: PerformanceAlert) => void) {
    this.alertListeners.push(callback)
    return () => {
      this.alertListeners = this.alertListeners.filter(listener => listener !== callback)
    }
  }

  private notifyListeners(metric: PerformanceMetric) {
    this.listeners.forEach(listener => {
      try {
        listener(metric)
      } catch (e) {
        console.error('Performance listener error:', e)
      }
    })
  }

  private notifyAlertListeners(alert: PerformanceAlert) {
    this.alertListeners.forEach(listener => {
      try {
        listener(alert)
      } catch (e) {
        console.error('Performance alert listener error:', e)
      }
    })
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  public getAlerts(): PerformanceAlert[] {
    return [...this.alerts]
  }

  public getAverageMetrics(): Record<string, number> {
    const grouped = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = []
      }
      acc[metric.name].push(metric.value)
      return acc
    }, {} as Record<string, number[]>)

    return Object.entries(grouped).reduce((acc, [name, values]) => {
      acc[name] = values.reduce((sum, val) => sum + val, 0) / values.length
      return acc
    }, {} as Record<string, number>)
  }

  public clearOldData(olderThanMs: number = 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - olderThanMs
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff)
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff)
  }

  // Send metrics to analytics service
  public async sendToAnalytics(endpoint?: string) {
    if (this.metrics.length === 0) return

    const data = {
      metrics: this.getAverageMetrics(),
      alerts: this.alerts.filter(alert => alert.timestamp > Date.now() - 60000), // Last minute
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      url: window.location.href
    }

    try {
      await fetch(endpoint || '/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
    } catch (e) {
      console.warn('Failed to send performance data:', e)
    }
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance()
export type { PerformanceMetric, PerformanceAlert }