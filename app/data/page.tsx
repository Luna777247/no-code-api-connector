import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Database, Search, Download, Filter } from "lucide-react"

export default function DataPage() {
  // Mock data
  const tables = [
    {
      name: "users_data",
      connection: "JSONPlaceholder Users API",
      recordCount: 100,
      lastUpdated: new Date(Date.now() - 3600000),
      fields: ["user_id", "user_name", "user_email", "user_phone", "company_name"],
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Data Explorer</h1>
          <p className="text-muted-foreground mt-1">Browse and export extracted data</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search tables..." className="pl-9" />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Connections</SelectItem>
                  <SelectItem value="users">Users API</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tables List */}
        {tables.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No data yet</h3>
              <p className="text-muted-foreground text-center mb-4 text-pretty max-w-md">
                Data will appear here once you run an API connection
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tables.map((table) => (
              <Card key={table.name}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Database className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg font-mono">{table.name}</CardTitle>
                        <Badge variant="outline">{table.recordCount} records</Badge>
                      </div>
                      <CardDescription>
                        From: {table.connection} • Last updated: {table.lastUpdated.toLocaleString()}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Fields ({table.fields.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {table.fields.map((field) => (
                        <Badge key={field} variant="secondary" className="font-mono text-xs">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
