"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Database, Calendar, Settings, List } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ReviewStepProps {
  data: {
    apiConfig: any
    parameters: any[]
    dataMapping: any
    schedule: any
  }
}

export function ReviewStep({ data }: ReviewStepProps) {
  const { apiConfig, parameters, dataMapping, schedule } = data

  return (
    <div className="space-y-6">
      {/* Summary Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Ready to Create Connection</p>
              <p className="text-sm text-muted-foreground mt-1">
                Review your configuration below. You can edit any section by going back to previous steps.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle className="text-base">API Configuration</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Connection Name</p>
              <p className="text-sm font-medium">{apiConfig.name || "Not set"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Method</p>
              <Badge variant="outline">{apiConfig.method}</Badge>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Base URL</p>
            <p className="text-sm font-mono bg-muted/50 p-2 rounded break-all">{apiConfig.baseUrl || "Not set"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Authentication</p>
            <Badge>{apiConfig.authType === "none" ? "No Authentication" : apiConfig.authType}</Badge>
          </div>
          {apiConfig.headers.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Headers ({apiConfig.headers.length})</p>
              <div className="space-y-1">
                {apiConfig.headers.map((header: any, index: number) => (
                  <div key={index} className="text-xs bg-muted/50 p-2 rounded font-mono">
                    <span className="text-muted-foreground">{header.key}:</span> {header.value}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parameters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <List className="h-5 w-5" />
            <CardTitle className="text-base">Parameters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {parameters.length === 0 ? (
            <p className="text-sm text-muted-foreground">No parameters configured</p>
          ) : (
            <div className="space-y-2">
              {parameters.map((param, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{param.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {param.type}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {param.mode}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {param.mode === "list" && `${param.values.length} values`}
                      {param.mode === "cartesian" && `${param.values.length} values (cartesian)`}
                      {param.mode === "template" && `Template: ${param.template}`}
                      {param.mode === "dynamic" && "Dynamic generation"}
                    </p>
                  </div>
                  {param.isRequired && <Badge className="text-xs">Required</Badge>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Mapping */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle className="text-base">Data Mapping</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Target Table</p>
            <p className="text-sm font-medium font-mono">{dataMapping.tableName || "Not set"}</p>
          </div>
          {dataMapping.selectedFields.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Selected Fields ({dataMapping.selectedFields.filter((f: any) => f.isSelected).length})
              </p>
              <ScrollArea className="h-48 border rounded-lg">
                <div className="p-2 space-y-1">
                  {dataMapping.selectedFields
                    .filter((f: any) => f.isSelected)
                    .map((field: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                        <code className="text-muted-foreground">{field.sourcePath}</code>
                        <span>→</span>
                        <span className="font-medium">{field.targetField}</span>
                        <Badge variant="outline" className="text-xs">
                          {field.dataType}
                        </Badge>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle className="text-base">Schedule</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!schedule.enabled ? (
            <p className="text-sm text-muted-foreground">Automated scheduling is disabled</p>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Schedule Type</p>
                  <Badge>{schedule.type}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CRON Expression</p>
                  <code className="text-sm bg-muted/50 px-2 py-1 rounded">{schedule.cronExpression}</code>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Next Run</p>
                <p className="text-sm font-medium">{new Date(Date.now() + 86400000).toLocaleString()}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estimated Impact */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Estimated Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">API Calls per Run</p>
              <p className="text-2xl font-bold">
                {parameters.reduce((acc, p) => {
                  if (p.mode === "list" || p.mode === "cartesian") return acc * (p.values.length || 1)
                  return acc
                }, 1)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fields to Extract</p>
              <p className="text-2xl font-bold">{dataMapping.selectedFields.filter((f: any) => f.isSelected).length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Runs per Day</p>
              <p className="text-2xl font-bold">{schedule.enabled ? (schedule.type === "hourly" ? 24 : 1) : 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
