'use client'

import { useState, useEffect, useMemo } from 'react'
import { performanceMonitor, PerformanceMetric, PerformanceAlert } from '@/lib/analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { Activity, AlertTriangle, CheckCircle, Clock, Gauge, TrendingUp, TrendingDown, Zap } from 'lucide-react'

interface PerformanceDashboardProps {
  className?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export default function PerformanceDashboard({
  className = '',
  autoRefresh = true,
  refreshInterval = 10000
}: PerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Initial load
    setMetrics(performanceMonitor.getMetrics())
    setAlerts(performanceMonitor.getAlerts())
    setIsConnected(true)

    // Subscribe to real-time updates
    const unsubscribeMetrics = performanceMonitor.onMetricUpdate((metric) => {
      setMetrics(prev => [...prev.slice(-99), metric]) // Keep last 100 metrics
    })

    const unsubscribeAlerts = performanceMonitor.onAlert((alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 9)]) // Keep last 10 alerts
    })

    // Auto refresh
    let interval: NodeJS.Timeout | undefined
    if (autoRefresh) {
      interval = setInterval(() => {
        performanceMonitor.clearOldData() // Clean old data
      }, refreshInterval)
    }

    return () => {
      unsubscribeMetrics()
      unsubscribeAlerts()
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  // Calculate averages and trends
  const averageMetrics = useMemo(() => {
    return performanceMonitor.getAverageMetrics()
  }, [metrics])

  // Prepare chart data
  const chartData = useMemo(() => {
    const coreVitals = metrics.filter(m => ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'].includes(m.name))
    const grouped = coreVitals.reduce((acc, metric) => {
      const timeKey = new Date(metric.timestamp).toISOString().slice(11, 19)
      if (!acc[timeKey]) {
        acc[timeKey] = { time: timeKey }
      }
      acc[timeKey][metric.name] = metric.value
      return acc
    }, {} as Record<string, any>)
    
    return Object.values(grouped).slice(-20) // Last 20 data points
  }, [metrics])

  // Performance rating distribution
  const ratingDistribution = useMemo(() => {
    const distribution = metrics.reduce((acc, metric) => {
      acc[metric.rating] = (acc[metric.rating] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return [
      { name: 'Good', value: distribution.good || 0, color: '#10b981' },
      { name: 'Needs Improvement', value: distribution['needs-improvement'] || 0, color: '#f59e0b' },
      { name: 'Poor', value: distribution.poor || 0, color: '#ef4444' }
    ].filter(item => item.value > 0)
  }, [metrics])

  const getScoreColor = (score: number, thresholds: { good: number, poor: number }) => {
    if (score <= thresholds.good) return 'text-green-600'
    if (score <= thresholds.poor) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadge = (rating: string) => {
    switch (rating) {
      case 'good':
        return <Badge className="bg-green-100 text-green-800">Good</Badge>
      case 'needs-improvement':
        return <Badge className="bg-yellow-100 text-yellow-800">Needs Improvement</Badge>
      case 'poor':
        return <Badge className="bg-red-100 text-red-800">Poor</Badge>
      default:
        return <Badge>Unknown</Badge>
    }
  }

  return (
    <div className={`space-y-6 p-6 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-600">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Performance Alerts ({alerts.length})
          </h3>
          {alerts.slice(0, 3).map((alert, index) => (
            <Alert key={index} className={alert.severity === 'critical' ? 'border-red-200' : 'border-orange-200'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                {alert.metric} Performance Issue
                <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                  {alert.severity}
                </Badge>
              </AlertTitle>
              <AlertDescription>
                Value: {Math.round(alert.value)}ms exceeds threshold of {alert.threshold}ms
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="core-vitals">Core Vitals</TabsTrigger>
          <TabsTrigger value="detailed">Detailed</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Core Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {['LCP', 'FID', 'CLS', 'FCP', 'TTFB'].map(metricName => {
              const latestMetric = metrics.filter(m => m.name === metricName).slice(-1)[0]
              const average = averageMetrics[metricName]
              const thresholds = {
                LCP: { good: 2500, poor: 4000 },
                FID: { good: 100, poor: 300 },
                CLS: { good: 0.1, poor: 0.25 },
                FCP: { good: 1800, poor: 3000 },
                TTFB: { good: 800, poor: 1800 }
              }[metricName] || { good: 1000, poor: 2000 }

              return (
                <Card key={metricName}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{metricName}</CardTitle>
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {latestMetric ? (
                        metricName === 'CLS' ? 
                          latestMetric.value.toFixed(3) : 
                          `${Math.round(latestMetric.value)}${metricName === 'CLS' ? '' : 'ms'}`
                      ) : 'N/A'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {latestMetric && getScoreBadge(latestMetric.rating)}
                    </div>
                    {average && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Avg: {metricName === 'CLS' ? average.toFixed(3) : `${Math.round(average)}ms`}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Performance Score Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Score Distribution</CardTitle>
                <CardDescription>Breakdown of metric ratings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ratingDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {ratingDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Overall performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Alerts</span>
                  <span className={`font-medium ${alerts.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {alerts.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Metrics Collected</span>
                  <span className="font-medium">{metrics.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Good Scores</span>
                  <span className="font-medium text-green-600">
                    {Math.round((ratingDistribution.find(r => r.name === 'Good')?.value || 0) / metrics.length * 100)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Data Freshness</span>
                  <span className="font-medium text-blue-600">
                    {metrics.length > 0 ? 
                      `${Math.round((Date.now() - Math.max(...metrics.map(m => m.timestamp))) / 1000)}s ago` : 
                      'No data'
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="core-vitals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Core Web Vitals Trend</CardTitle>
              <CardDescription>Real-time performance metrics over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="LCP" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="FID" stroke="#82ca9d" strokeWidth={2} />
                    <Line type="monotone" dataKey="FCP" stroke="#ffc658" strokeWidth={2} />
                    <Line type="monotone" dataKey="TTFB" stroke="#ff7300" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          {/* Recent Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Metrics</CardTitle>
              <CardDescription>Latest performance measurements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Metric</th>
                      <th className="text-left p-2">Value</th>
                      <th className="text-left p-2">Rating</th>
                      <th className="text-left p-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.slice(-20).reverse().map((metric, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{metric.name}</td>
                        <td className="p-2">
                          {metric.name === 'CLS' ? 
                            metric.value.toFixed(3) : 
                            `${Math.round(metric.value)}ms`
                          }
                        </td>
                        <td className="p-2">{getScoreBadge(metric.rating)}</td>
                        <td className="p-2 text-gray-500">
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Historical performance analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(averageMetrics).map(([metricName, average]) => {
                  const recentMetrics = metrics.filter(m => m.name === metricName).slice(-10)
                  const trend = recentMetrics.length > 1 ? 
                    (recentMetrics[recentMetrics.length - 1].value - recentMetrics[0].value) / recentMetrics[0].value * 100 : 0
                  
                  return (
                    <div key={metricName} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{metricName}</div>
                        <div className="text-sm text-gray-500">
                          Avg: {metricName === 'CLS' ? average.toFixed(3) : `${Math.round(average)}ms`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {trend > 0 ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : trend < 0 ? (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                        <span className={`text-sm font-medium ${
                          trend > 0 ? 'text-red-600' : trend < 0 ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}