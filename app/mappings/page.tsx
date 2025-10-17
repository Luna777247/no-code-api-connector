import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings, Database, ArrowRight } from "lucide-react"
import { BackToHomeButton } from "@/components/ui/back-to-home-button"

export default function MappingsPage() {
  // Mock data
  const mappings = [
    {
      id: "1",
      connectionName: "JSONPlaceholder Users API",
      tableName: "users_data",
      fieldCount: 5,
      lastUpdated: new Date(Date.now() - 3600000),
      fields: [
        { source: "$.id", target: "user_id", type: "number" },
        { source: "$.name", target: "user_name", type: "string" },
        { source: "$.email", target: "user_email", type: "string" },
        { source: "$.phone", target: "user_phone", type: "string" },
        { source: "$.company.name", target: "company_name", type: "string" },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <BackToHomeButton />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Field Mappings</h1>
          <p className="text-muted-foreground mt-1">Configure how API fields map to database columns</p>
        </div>

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
                        <Badge variant="outline">{mapping.fieldCount} fields</Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <Database className="h-3 w-3" />
                        Target table: <code className="text-xs bg-muted px-1 py-0.5 rounded">{mapping.tableName}</code>
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
                        <code className="text-muted-foreground flex-1">{field.source}</code>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium flex-1">{field.target}</span>
                        <Badge variant="outline" className="text-xs">
                          {field.type}
                        </Badge>
                      </div>
                    ))}
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
