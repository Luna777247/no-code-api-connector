import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, Zap, Calendar, BarChart3, Settings, PlayCircle } from "lucide-react"
import { SystemStats } from "@/components/system-stats"
import { PageLayout } from "@/components/ui/page-layout"

export default function HomePage() {
  return (
    <PageLayout
      title="Data Platform"
      headerActions={
        <Link href="/connections/new">
          <Button size="lg" className="gap-2">
            <Zap className="h-5 w-5" />
            New Connection
          </Button>
        </Link>
      }
    >
      {/* Quick Stats */}
      <SystemStats />

        {/* Main Navigation Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/connections">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Database className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>API Connections</CardTitle>
                </div>
                <CardDescription className="text-pretty">
                  Manage your API connections, configure endpoints, parameters, and authentication
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/schedules">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-chart-2/10 rounded-lg">
                    <Calendar className="h-6 w-6 text-chart-2" />
                  </div>
                  <CardTitle>Schedules</CardTitle>
                </div>
                <CardDescription className="text-pretty">
                  Set up automated runs with daily, weekly, monthly, or custom CRON schedules
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/runs">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-chart-3/10 rounded-lg">
                    <PlayCircle className="h-6 w-6 text-chart-3" />
                  </div>
                  <CardTitle>Run History</CardTitle>
                </div>
                <CardDescription className="text-pretty">
                  View execution history, logs, and monitor the status of your API runs
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/data">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-chart-4/10 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-chart-4" />
                  </div>
                  <CardTitle>Data Explorer</CardTitle>
                </div>
                <CardDescription className="text-pretty">
                  Browse extracted data, view transformations, and export to your data warehouse
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/mappings">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-chart-5/10 rounded-lg">
                    <Settings className="h-6 w-6 text-chart-5" />
                  </div>
                  <CardTitle>Field Mappings</CardTitle>
                </div>
                <CardDescription className="text-pretty">
                  Configure how API response fields map to your database schema
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboards">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-purple-500" />
                  </div>
                  <CardTitle>Analytics Dashboards</CardTitle>
                </div>
                <CardDescription className="text-pretty">
                  Interactive Metabase dashboards with real-time ETL performance and data quality metrics
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/monitoring">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-chart-1/10 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-chart-1" />
                  </div>
                  <CardTitle>Monitoring</CardTitle>
                </div>
                <CardDescription className="text-pretty">
                  Real-time system health, performance metrics, logs, and alerts
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Card className="bg-muted/50 border-dashed">
            <CardHeader>
              <CardTitle className="text-muted-foreground">Getting Started</CardTitle>
              <CardDescription className="text-pretty">
                Click &quot;New Connection&quot; to create your first API integration and start extracting data automatically
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-12 p-6 bg-muted/30 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Platform Features</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex gap-3">
              <div className="text-primary">✓</div>
              <div>
                <p className="font-medium">Multi-Parameter Support</p>
                <p className="text-sm text-muted-foreground">List, Cartesian product, and template modes</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-primary">✓</div>
              <div>
                <p className="font-medium">Dynamic Parameters</p>
                <p className="text-sm text-muted-foreground">Date ranges, incremental IDs, and custom logic</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-primary">✓</div>
              <div>
                <p className="font-medium">Automatic Schema Detection</p>
                <p className="text-sm text-muted-foreground">Parse JSON responses and suggest mappings</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-primary">✓</div>
              <div>
                <p className="font-medium">Full ETL Pipeline</p>
                <p className="text-sm text-muted-foreground">Extract, transform, and load to data warehouse</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-primary">✓</div>
              <div>
                <p className="font-medium">Flexible Scheduling</p>
                <p className="text-sm text-muted-foreground">CRON expressions and preset intervals</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-primary">✓</div>
              <div>
                <p className="font-medium">Comprehensive Logging</p>
                <p className="text-sm text-muted-foreground">Track every request and transformation</p>
              </div>
            </div>
          </div>
        </div>
    </PageLayout>
  )
}