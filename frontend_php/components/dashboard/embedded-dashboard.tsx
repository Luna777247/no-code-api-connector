'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { RefreshCw, ExternalLink, Maximize2 } from 'lucide-react'

interface EmbeddedDashboardProps {
  reportUrl: string
  title?: string
  description?: string
  params?: Record<string, any>
  bordered?: boolean
  titled?: boolean
  theme?: 'light' | 'dark' | 'transparent'
  height?: string | number
  autoRefresh?: boolean
  refreshInterval?: number // in seconds
  showControls?: boolean
  fallbackToExternal?: boolean // If true, show external link when iframe fails
}

export function EmbeddedDashboard({
  reportUrl,
  title = 'Google Looker Studio Report',
  description,
  params = {},
  bordered = true,
  titled = true,
  theme = 'light',
  height = '800px',
  autoRefresh = false,
  refreshInterval = 300, // 5 minutes
  showControls = true,
  fallbackToExternal = true,
}: EmbeddedDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Memoize params string to avoid complex expression in useEffect dependency
  const paramsString = useMemo(() => JSON.stringify(params || {}), [params])

  // Build full embed URL with parameters
  const buildEmbedUrl = (baseUrl: string, params: Record<string, any>): string => {
    try {
      // Convert sharing URL to embed URL if needed
      let embedUrl = baseUrl
      
      // If it's a sharing URL, convert to embed URL
      if (baseUrl.includes('/reporting/') && !baseUrl.includes('/embed/')) {
        embedUrl = baseUrl.replace('/reporting/', '/embed/reporting/')
      }
      
      const url = new URL(embedUrl)
      
      // Add parameters to URL if provided
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value))
        }
      })
      
      return url.toString()
    } catch (err) {
      console.error('[v0] Error building embed URL:', err)
      return baseUrl // fallback to original URL
    }
  }

  const embedUrl = buildEmbedUrl(reportUrl, params)

  const loadReport = async () => {
    try {
      setLoading(true)
      setError(null)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('[v0] Error loading report:', err)
      setError('Failed to load report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [reportUrl, paramsString])

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        loadReport()
      }, refreshInterval * 1000)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const handleRefresh = () => {
    loadReport()
  }

  const handleOpenExternal = () => {
    window.open(embedUrl, '_blank')
  }

  const handleFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen()
      }
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {showControls && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFullscreen}
                disabled={!embedUrl}
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Fullscreen
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenExternal}
                disabled={!embedUrl}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </Button>
            </div>
          )}
        </div>
        {autoRefresh && (
          <p className="text-xs text-muted-foreground">
            Auto-refreshing every {refreshInterval}s • Last refresh:{' '}
            {lastRefresh.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {!loading && embedUrl && (
          <div className="relative w-full" style={{ height }}>
            <iframe
              ref={iframeRef}
              src={embedUrl}
              className="w-full h-full border-0 rounded-lg"
              allowFullScreen
              title={title}
              onLoad={() => setLoading(false)}
              onError={() => {
                setError('Unable to embed report. This may be due to browser security restrictions or report sharing settings.')
                setLoading(false)
              }}
            />
          </div>
        )}

        {!loading && !embedUrl && !error && (
          <Alert>
            <AlertDescription>
              Report URL not available. Please check your configuration.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="space-y-2">
              <p>{error}</p>
              {fallbackToExternal && (
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenExternal}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Report in New Tab
                  </Button>
                </div>
              )}
              <div className="text-sm space-y-1 pt-2 border-t">
                <p className="font-medium">Troubleshooting:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Ensure the Looker Studio report is set to &quot;Anyone with the link can view&quot;</li>
                  <li>Check if your browser blocks third-party content</li>
                  <li>Try disabling browser extensions that may block embeds</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
