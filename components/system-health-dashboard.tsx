'use client'

import React, { useState, useEffect } from 'react'
import { SystemHealthMetrics, ServiceHealthStatus, Alert, metricsCollector } from '../utils/monitoring/metrics-collector'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Globe, 
  RefreshCw, 
  Server, 
  TrendingUp,
  XCircle,
  Zap
} from 'lucide-react'
import { cn } from '../lib/utils'

interface HealthDashboardProps {
  refreshInterval?: number
  showAlerts?: boolean
  showServices?: boolean
  showMetrics?: boolean
}

export function SystemHealthDashboard({ 
  refreshInterval = 30000, // 30 seconds
  showAlerts = true,
  showServices = true,
  showMetrics = true
}: HealthDashboardProps) {
  const [healthData, setHealthData] = useState<SystemHealthMetrics | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchHealthData = async () => {
    try {
      setIsLoading(true)
      const health = metricsCollector.getSystemHealth()
      const activeAlerts = metricsCollector.getActiveAlerts()
      
      setHealthData(health)
      setAlerts(activeAlerts)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to fetch health data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHealthData()
    
    const interval = setInterval(fetchHealthData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  const handleRefresh = () => {
    fetchHealthData()
  }

  const handleResolveAlert = (alertId: string) => {
    metricsCollector.resolveAlert(alertId)
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }

  if (isLoading && !healthData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading system health...</span>
        </div>
      </div>
    )
  }

  if (!healthData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-gray-600">Failed to load system health data</p>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Health Dashboard</h2>
          <p className="text-gray-600">
            Last updated: {lastUpdated?.toLocaleTimeString() || 'Never'}
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Alerts Section */}
      {showAlerts && alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map(alert => (
                <AlertCard 
                  key={alert.id} 
                  alert={alert} 
                  onResolve={handleResolveAlert}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {showMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Response Time"
            value={`${Math.round(healthData.performance.responseTime.value)}ms`}
            icon={Clock}
            status={getMetricStatus(healthData.performance.responseTime.value, 2000, 5000)}
            description="Average response time"
          />
          <MetricCard
            title="Throughput"
            value={`${healthData.performance.throughput.value}/min`}
            icon={TrendingUp}
            status="healthy"
            description="Requests per minute"
          />
          <MetricCard
            title="Error Rate"
            value={`${healthData.performance.errorRate.value.toFixed(1)}%`}
            icon={AlertTriangle}
            status={getMetricStatus(healthData.performance.errorRate.value, 5, 10, true)}
            description="Error percentage"
          />
          <MetricCard
            title="Total Errors"
            value={healthData.errors.totalErrors.toString()}
            icon={XCircle}
            status={healthData.errors.totalErrors > 10 ? 'unhealthy' : 'healthy'}
            description="Errors in last 5 minutes"
          />
        </div>
      )}

      {/* Services Health */}
      {showServices && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="h-5 w-5 mr-2" />
              Services Health
            </CardTitle>
            <CardDescription>
              Status of external services and dependencies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ServiceCard
                name="SFMC API"
                status={healthData.services.sfmcApi}
                icon={Globe}
              />
              <ServiceCard
                name="AI Service"
                status={healthData.services.aiService}
                icon={Zap}
              />
              <ServiceCard
                name="Database"
                status={healthData.services.database}
                icon={Database}
              />
              <ServiceCard
                name="Cache"
                status={healthData.services.cache}
                icon={Activity}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Request Statistics</CardTitle>
          <CardDescription>Request metrics for the last 5 minutes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Success Rate</span>
                <span className="text-sm text-gray-600">
                  {healthData.requests.totalRequests > 0 
                    ? ((healthData.requests.successfulRequests / healthData.requests.totalRequests) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <Progress 
                value={healthData.requests.totalRequests > 0 
                  ? (healthData.requests.successfulRequests / healthData.requests.totalRequests) * 100
                  : 0} 
                className="h-2"
              />
            </div>
            
            <div className="space-y-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {healthData.requests.successfulRequests}
                </div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {healthData.requests.failedRequests}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Breakdown */}
      {healthData.errors.totalErrors > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Error Breakdown</CardTitle>
            <CardDescription>Errors by type in the last hour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(healthData.errors.errorsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{type.replace(/_/g, ' ')}</span>
                  <Badge variant={count > 5 ? 'destructive' : 'secondary'}>
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  status: 'healthy' | 'degraded' | 'unhealthy'
  description: string
}

function MetricCard({ title, value, icon: Icon, status, description }: MetricCardProps) {
  const statusColors = {
    healthy: 'text-green-600 bg-green-50 border-green-200',
    degraded: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    unhealthy: 'text-red-600 bg-red-50 border-red-200'
  }

  return (
    <Card className={cn('border', statusColors[status])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          <Icon className="h-8 w-8 opacity-60" />
        </div>
      </CardContent>
    </Card>
  )
}

interface ServiceCardProps {
  name: string
  status: ServiceHealthStatus
  icon: React.ComponentType<{ className?: string }>
}

function ServiceCard({ name, status, icon: Icon }: ServiceCardProps) {
  const getStatusColor = (status: ServiceHealthStatus['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'unhealthy': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: ServiceHealthStatus['status']) => {
    switch (status) {
      case 'healthy': return CheckCircle
      case 'degraded': return AlertTriangle
      case 'unhealthy': return XCircle
      default: return Clock
    }
  }

  const StatusIcon = getStatusIcon(status.status)

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5" />
            <span className="font-medium">{name}</span>
          </div>
          <StatusIcon className={cn('h-4 w-4', getStatusColor(status.status))} />
        </div>
        
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={cn('font-medium', getStatusColor(status.status))}>
              {status.status}
            </span>
          </div>
          
          {status.responseTime && (
            <div className="flex justify-between">
              <span>Response:</span>
              <span>{status.responseTime}ms</span>
            </div>
          )}
          
          {status.errorRate !== undefined && (
            <div className="flex justify-between">
              <span>Error Rate:</span>
              <span>{status.errorRate.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface AlertCardProps {
  alert: Alert
  onResolve: (alertId: string) => void
}

function AlertCard({ alert, onResolve }: AlertCardProps) {
  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'low': return 'border-blue-200 bg-blue-50 text-blue-800'
      case 'medium': return 'border-yellow-200 bg-yellow-50 text-yellow-800'
      case 'high': return 'border-orange-200 bg-orange-50 text-orange-800'
      case 'critical': return 'border-red-200 bg-red-50 text-red-800'
    }
  }

  return (
    <div className={cn('border rounded-lg p-3', getSeverityColor(alert.severity))}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {alert.severity.toUpperCase()}
            </Badge>
            <span className="text-xs text-gray-600">
              {alert.triggeredAt.toLocaleTimeString()}
            </span>
          </div>
          <p className="text-sm font-medium">{alert.message}</p>
          {alert.context && (
            <p className="text-xs mt-1 opacity-75">
              Metric: {alert.context.metric} | Value: {alert.currentValue}
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onResolve(alert.id)}
          className="ml-2"
        >
          Resolve
        </Button>
      </div>
    </div>
  )
}

function getMetricStatus(
  value: number, 
  warningThreshold: number, 
  criticalThreshold: number,
  inverse: boolean = false
): 'healthy' | 'degraded' | 'unhealthy' {
  if (inverse) {
    if (value >= criticalThreshold) return 'unhealthy'
    if (value >= warningThreshold) return 'degraded'
    return 'healthy'
  } else {
    if (value >= criticalThreshold) return 'unhealthy'
    if (value >= warningThreshold) return 'degraded'
    return 'healthy'
  }
}