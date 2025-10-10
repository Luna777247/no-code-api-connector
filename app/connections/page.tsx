import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Database, Calendar, Activity } from "lucide-react"

export default function ConnectionsPage() {
  // Mock data - will be replaced with real data from database
  const connections = [
    {
      id: "1",
      name: "JSONPlaceholder Users API",
      description: "Sample API for testing - fetches user data",
      baseUrl: "https://jsonplaceholder.typicode.com/users",
      method: "GET",
      isActive: true,
      lastRun: "2 hours ago",
      totalRuns: 15,
      successRate: 100,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">API Connections</h1>
            <p className="text-muted-foreground mt-1">Manage your API integrations and configurations</p>
          </div>
          <Link href="/connections/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Connection
            </Button>
          </Link>
        </div>

        {/* Connections List */}
        {connections.length === 0 ? (
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
            {connections.map((connection) => (
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
                    </div>
                    <Link href={`/connections/${connection.id}`}>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Method:</span>
                      <Badge variant="outline">{connection.method}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Success Rate:</span>
                      <span className="font-medium">{connection.successRate}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Last Run:</span>
                      <span className="font-medium">{connection.lastRun}</span>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-muted/50 rounded text-xs font-mono break-all">{connection.baseUrl}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
