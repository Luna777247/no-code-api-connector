"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Play, CheckCircle2, AlertCircle, Database } from "lucide-react"

interface DataMappingStepProps {
  data: {
    selectedFields: Array<{
      sourcePath: string
      targetField: string
      dataType: string
      isSelected: boolean
    }>
    tableName: string
  }
  apiConfig: any
  onChange: (data: any) => void
}

export function DataMappingStep({ data, apiConfig, onChange }: DataMappingStepProps) {
  const [isTestingApi, setIsTestingApi] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [detectedFields, setDetectedFields] = useState<any[]>([])

  const testApiConnection = async () => {
    setIsTestingApi(true)
    setTestError(null)

    try {
      // Simulate API call - in production, this would call the actual API
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock response based on the API URL
      const mockResponse = {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        phone: "+1-234-567-8900",
        website: "johndoe.com",
        company: {
          name: "Acme Corp",
          catchPhrase: "Innovative solutions",
          bs: "synergize scalable solutions",
        },
        address: {
          street: "123 Main St",
          city: "New York",
          zipcode: "10001",
        },
      }

      setTestResult(mockResponse)

      // Auto-detect fields from response
      const fields = extractFields(mockResponse)
      setDetectedFields(fields)

      // Auto-populate selected fields if none exist
      if (data.selectedFields.length === 0) {
        onChange({
          ...data,
          selectedFields: fields.map((field) => ({
            sourcePath: field.path,
            targetField: field.suggestedName,
            dataType: field.type,
            isSelected: true,
          })),
        })
      }
    } catch (error) {
      setTestError("Failed to connect to API. Please check your configuration.")
    } finally {
      setIsTestingApi(false)
    }
  }

  const extractFields = (obj: any, prefix = "$"): any[] => {
    const fields: any[] = []

    const traverse = (current: any, path: string) => {
      if (current === null || current === undefined) return

      if (typeof current === "object" && !Array.isArray(current)) {
        Object.keys(current).forEach((key) => {
          const newPath = `${path}.${key}`
          const value = current[key]

          if (typeof value === "object" && !Array.isArray(value) && value !== null) {
            traverse(value, newPath)
          } else {
            fields.push({
              path: newPath,
              suggestedName: key.toLowerCase().replace(/[^a-z0-9]/g, "_"),
              type: detectType(value),
              sampleValue: value,
            })
          }
        })
      }
    }

    traverse(obj, prefix)
    return fields
  }

  const detectType = (value: any): string => {
    if (typeof value === "number") return "number"
    if (typeof value === "boolean") return "boolean"
    if (value instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(value)) return "date"
    return "string"
  }

  const toggleFieldSelection = (index: number) => {
    const newFields = [...data.selectedFields]
    newFields[index].isSelected = !newFields[index].isSelected
    onChange({ ...data, selectedFields: newFields })
  }

  const updateFieldMapping = (index: number, field: string, value: string) => {
    const newFields = [...data.selectedFields]
    newFields[index] = { ...newFields[index], [field]: value }
    onChange({ ...data, selectedFields: newFields })
  }

  return (
    <div className="space-y-6">
      {/* Test API Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test API Connection</CardTitle>
          <CardDescription>Test your API to preview the response structure and detect fields</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button onClick={testApiConnection} disabled={isTestingApi || !apiConfig.baseUrl} className="gap-2">
              {isTestingApi ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>
            {testResult && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Connection successful
              </div>
            )}
            {testError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {testError}
              </div>
            )}
          </div>

          {testResult && (
            <div>
              <Label className="mb-2 block">API Response Preview</Label>
              <ScrollArea className="h-48 w-full rounded-md border bg-muted/50">
                <pre className="p-4 text-xs font-mono">{JSON.stringify(testResult, null, 2)}</pre>
              </ScrollArea>
              <p className="text-xs text-muted-foreground mt-2">
                Detected {detectedFields.length} fields from response
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Mapping */}
      {data.selectedFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Field Mapping</CardTitle>
            <CardDescription>Select fields to extract and map them to your database columns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Table Name */}
            <div>
              <Label htmlFor="tableName">Target Table Name *</Label>
              <div className="flex gap-2 mt-1.5">
                <div className="relative flex-1">
                  <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="tableName"
                    placeholder="e.g., users_data"
                    value={data.tableName}
                    onChange={(e) => onChange({ ...data, tableName: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Data will be stored in this table. Table will be created automatically if it doesn't exist.
              </p>
            </div>

            {/* Field List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <Label>Fields ({data.selectedFields.filter((f) => f.isSelected).length} selected)</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newFields = data.selectedFields.map((f) => ({ ...f, isSelected: true }))
                      onChange({ ...data, selectedFields: newFields })
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newFields = data.selectedFields.map((f) => ({ ...f, isSelected: false }))
                      onChange({ ...data, selectedFields: newFields })
                    }}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg divide-y">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground">
                  <div className="col-span-1">Select</div>
                  <div className="col-span-4">Source Path</div>
                  <div className="col-span-4">Target Column</div>
                  <div className="col-span-3">Data Type</div>
                </div>

                {/* Field Rows */}
                <ScrollArea className="max-h-96">
                  {data.selectedFields.map((field, index) => (
                    <div
                      key={index}
                      className={`grid grid-cols-12 gap-4 p-3 items-center ${!field.isSelected ? "opacity-50" : ""}`}
                    >
                      <div className="col-span-1">
                        <Checkbox checked={field.isSelected} onCheckedChange={() => toggleFieldSelection(index)} />
                      </div>
                      <div className="col-span-4">
                        <code className="text-xs bg-muted px-2 py-1 rounded">{field.sourcePath}</code>
                      </div>
                      <div className="col-span-4">
                        <Input
                          value={field.targetField}
                          onChange={(e) => updateFieldMapping(index, "targetField", e.target.value)}
                          disabled={!field.isSelected}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-3">
                        <Select
                          value={field.dataType}
                          onValueChange={(value) => updateFieldMapping(index, "dataType", value)}
                          disabled={!field.isSelected}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">String</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="json">JSON</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg text-sm">
              <div>
                <span className="text-muted-foreground">Selected Fields:</span>
                <span className="font-medium ml-2">{data.selectedFields.filter((f) => f.isSelected).length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Target Table:</span>
                <span className="font-medium ml-2">{data.tableName || "Not set"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Transformation Options */}
      {data.selectedFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Transformation</CardTitle>
            <CardDescription>Configure how data should be processed before storage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Deduplicate Records</p>
                  <p className="text-xs text-muted-foreground">Remove duplicate entries based on key fields</p>
                </div>
                <Checkbox />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Normalize Data</p>
                  <p className="text-xs text-muted-foreground">Apply data normalization rules</p>
                </div>
                <Checkbox />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Validate Schema</p>
                  <p className="text-xs text-muted-foreground">Validate data against schema before insert</p>
                </div>
                <Checkbox defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Store Raw Data</p>
                  <p className="text-xs text-muted-foreground">Keep original API response for audit</p>
                </div>
                <Checkbox defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
