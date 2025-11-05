'use client'

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { BackToHomeButton } from "@/components/ui/back-to-home-button"
import apiClient from "../../../services/apiClient.js"

export default function RunStartingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const connectionId = searchParams.get('connectionId')
  const [status, setStatus] = useState('starting') // starting, success, error
  const [runId, setRunId] = useState(null)
  const [error, setError] = useState(null)
  const [connection, setConnection] = useState(null)

  useEffect(() => {
    if (!connectionId) {
      setStatus('error')
      setError('No connection ID provided')
      return
    }

    const startRun = async () => {
      try {
        // Bước 1: Lấy thông tin connection
        setStatus('starting')
        const connectionRes = await apiClient.get(`/api/connections/${connectionId}`)
        const connectionData = connectionRes.data
        setConnection(connectionData)

        // Bước 2: Tạo run
        const headersObject = {}
        if (Array.isArray(connectionData.headers)) {
          connectionData.headers.forEach(header => {
            if (typeof header === 'object') {
              if (header.key && header.value) {
                headersObject[header.key] = header.value
              } else if (Object.keys(header).length === 1) {
                const [key, value] = Object.entries(header)[0]
                headersObject[key] = value
              }
            }
          })
        }

        const runData = {
          connectionId: connectionData.connectionId || connectionData.id,
          apiConfig: {
            baseUrl: connectionData.baseUrl,
            method: connectionData.method,
            headers: headersObject,
            authType: connectionData.authType || 'none',
            authConfig: connectionData.authConfig || {}
          },
          parameters: [],
          fieldMappings: []
        }

        const response = await apiClient.post('/api/execute-run', runData)
        const result = response.data

        if (result.runId) {
          setRunId(result.runId)
          setStatus('success')

          // Tự động chuyển hướng sau 3 giây
          setTimeout(() => {
            router.push(`/runs/${result.runId}`)
          }, 3000)
        } else {
          throw new Error('Failed to get run ID from response')
        }
      } catch (err) {
        console.error('Error starting run:', err)
        setStatus('error')
        setError(err.response?.data?.message || err.message || 'Failed to start pipeline')
      }
    }

    startRun()
  }, [connectionId, router])

  const getStatusContent = () => {
    switch (status) {
      case 'starting':
        return {
          icon: <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />,
          title: "Starting Pipeline",
          description: "Initializing your API pipeline execution...",
          color: "text-blue-600"
        }
      case 'success':
        return {
          icon: <CheckCircle2 className="h-12 w-12 text-green-500" />,
          title: "Pipeline Started Successfully",
          description: `Run ID: ${runId}. Redirecting to run details...`,
          color: "text-green-600"
        }
      case 'error':
        return {
          icon: <XCircle className="h-12 w-12 text-red-500" />,
          title: "Failed to Start Pipeline",
          description: error || "An error occurred while starting the pipeline",
          color: "text-red-600"
        }
      default:
        return {
          icon: <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />,
          title: "Processing",
          description: "Please wait...",
          color: "text-muted-foreground"
        }
    }
  }

  const statusContent = getStatusContent()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-8">
          <BackToHomeButton />
          <Button variant="ghost" asChild className="gap-2">
            <Link href="/connections">
              <ArrowLeft className="h-4 w-4" />
              Back to Connections
            </Link>
          </Button>
        </div>

        {/* Status Card */}
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-4">
                {statusContent.icon}
              </div>
              <CardTitle className={`text-2xl ${statusContent.color}`}>
                {statusContent.title}
              </CardTitle>
              <CardDescription className="text-lg">
                {statusContent.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Progress Steps */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${status === 'starting' || status === 'success' || status === 'error' ? 'bg-green-500' : 'bg-muted'}`} />
                  <span className={`text-sm ${status === 'starting' || status === 'success' || status === 'error' ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                    Initializing pipeline configuration
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${status === 'success' || status === 'error' ? 'bg-green-500' : status === 'starting' ? 'bg-blue-500 animate-pulse' : 'bg-muted'}`} />
                  <span className={`text-sm ${status === 'success' || status === 'error' ? 'text-green-600 font-medium' : status === 'starting' ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
                    Creating execution job
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${status === 'success' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-muted'}`} />
                  <span className={`text-sm ${status === 'success' ? 'text-green-600 font-medium' : status === 'error' ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                    {status === 'success' ? 'Pipeline started successfully' : status === 'error' ? 'Pipeline failed to start' : 'Starting pipeline execution'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 pt-4">
                {status === 'error' && (
                  <Button asChild>
                    <Link href={`/connections/${connectionId}`}>
                      Try Again
                    </Link>
                  </Button>
                )}

                {status === 'success' && (
                  <Button asChild variant="outline">
                    <Link href={`/runs/${runId}`}>
                      View Run Details
                    </Link>
                  </Button>
                )}

                <Button variant="outline" asChild>
                  <Link href="/runs">
                    View All Runs
                  </Link>
                </Button>
              </div>

              {/* Auto-redirect notice */}
              {status === 'success' && (
                <p className="text-center text-sm text-muted-foreground">
                  You will be automatically redirected to the run details page in a few seconds...
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}