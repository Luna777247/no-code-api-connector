'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Database, Calendar, Activity, Clock, XCircle } from "lucide-react"
import { BackToHomeButton } from "@/components/ui/back-to-home-button"

interface Connection {
  id: string
  connectionId: string
  name: string
  description: string
  baseUrl: string
  method: string
  isActive: boolean
  lastRun?: string
  totalRuns: number
  successRate: number
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('[v0] Fetching connections from API...')
    fetch('/api/connections')
      .then(res => res.json())
      .then(data => {
        console.log('[v0] Connections fetched:', data)
        setConnections(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('[v0] Error fetching connections:', err)
        setError('Failed to load connections')
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <BackToHomeButton />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">API Connections</h1>
              <p className="text-muted-foreground mt-1">Manage your API integrations and configurations</p>
            </div>
          </div>
          <Link href="/connections/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Connection
            </Button>
          </Link>
        </div>

        {/* Connections List */}
        {loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
              <p className="text-muted-foreground">Loading connections...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error loading connections</h3>
              <p className="text-muted-foreground text-center">{error}</p>
            </CardContent>
          </Card>
        ) : connections.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
              <p className="text-muted-foreground text-center mb-4 text-pretty max-w-md">
                Create your first API connection to start extracting data automatically
              </p>
              <Link href="/connections/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Connection
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {connections.map((connection) => {
              const lastRun = connection.lastRun 
                ? new Date(connection.lastRun).toLocaleString() 
                : 'Never'
              
              return (
                <Card key={connection.id} className="hover:border-primary transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle>{connection.name}</CardTitle>
                          <Badge variant={connection.isActive ? "default" : "secondary"}>
                            {connection.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <CardDescription className="text-pretty">{connection.description}</CardDescription>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          ID: {connection.connectionId}
                        </p>
                      </div>
                      <Link href={`/connections/${connection.connectionId || connection.id}`}>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 text-sm flex-wrap">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Method:</span>
                        <Badge variant="outline">{connection.method}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Total Runs:</span>
                        <span className="font-medium">{connection.totalRuns}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Last Run:</span>
                        <span className="font-medium">{lastRun}</span>
                      </div>
                    </div>
                    {connection.baseUrl && (
                      <div className="mt-3 p-2 bg-muted/50 rounded text-xs font-mono break-all">
                        {connection.baseUrl}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
