'use client'

import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings, Database, ArrowRight, Loader2 } from "lucide-react"
import { PageLayout } from "@/components/ui/page-layout"

interface FieldMapping {
  sourcePath: string
  targetField: string
  dataType: string
}

interface Mapping {
  id: string
  connectionName: string
  tableName: string
  fieldCount: number
  lastUpdated: string
  fields: FieldMapping[]
}

export default function MappingsPage() {
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMappings() {
      try {
        setLoading(true)
        const response = await fetch('/api/mappings')
        if (!response.ok) {
          throw new Error('Failed to fetch field mappings')
        }
        const data = await response.json()
        setMappings(data.mappings || [])
      } catch (err) {
        console.error('[v0] Error fetching field mappings:', err)
        setError(err instanceof Error ? err.message : 'Failed to load field mappings')
      } finally {
        setLoading(false)
      }
    }

    fetchMappings()
  }, [])

  if (loading) {
    return (
      <PageLayout
        title="Field Mappings"
        description="Configure how API fields map to database columns"
        showBackButton={true}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading field mappings...</span>
        </div>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout
        title="Field Mappings"
        description="Configure how API fields map to database columns"
        showBackButton={true}
      >
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-destructive mb-4">⚠️ Error loading field mappings</div>
            <p className="text-muted-foreground text-center mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Field Mappings"
      description="Configure how API fields map to database columns"
      showBackButton={true}
    >

        {/* Mappings List */}
        {mappings.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No field mappings configured</h3>
              <p className="text-muted-foreground text-center mb-4 text-pretty max-w-md">
                Create an API connection to configure field mappings
              </p>
              <Link href="/connections/new">
                <Button>Create Connection</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {mappings.map((mapping) => (
              <Card key={mapping.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{mapping.connectionName}</CardTitle>
                        <Badge variant="outline">{mapping.fields?.length || 0} fields</Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <Database className="h-3 w-3" />
                        Target table: <code className="text-xs bg-muted px-1 py-0.5 rounded">{mapping.tableName || 'N/A'}</code>
                        {mapping.lastUpdated && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            Updated {new Date(mapping.lastUpdated).toLocaleDateString()}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Link href={`/connections/${mapping.id}`}>
                      <Button variant="outline" size="sm">
                        Edit Mapping
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {mapping.fields.map((field, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded text-sm">
                        <code className="text-muted-foreground flex-1">{field.sourcePath}</code>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium flex-1">{field.targetField}</span>
                        <Badge variant="outline" className="text-xs">
                          {field.dataType}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </PageLayout>
  )
}
