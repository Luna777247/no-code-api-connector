"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Loader2, Play, CheckCircle2, AlertCircle, Database, Search, Filter, Settings, Eye, EyeOff, ArrowUpDown, Copy, Trash2, Clock } from "lucide-react"

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
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [showOnlySelected, setShowOnlySelected] = useState(false)
  const [sortBy, setSortBy] = useState<string>("sourcePath")
  const [lastTestTime, setLastTestTime] = useState<number>(0)

  const testApiConnection = async () => {
    // Prevent rapid testing to avoid rate limits
    const now = Date.now()
    const timeSinceLastTest = now - lastTestTime
    if (timeSinceLastTest < 2000) { // 2 second cooldown
      setTestError("Please wait a moment before testing again to avoid rate limits.")
      return
    }
    
    setIsTestingApi(true)
    setTestError(null)
    setLastTestTime(now)

    try {
      // Import ApiExecutor dynamically to avoid SSR issues
      const { ApiExecutor } = await import("@/lib/api-executor")

      const executor = new ApiExecutor()

      // Build the API request from user configuration
      const apiRequest = {
        url: apiConfig.baseUrl,
        method: apiConfig.method || 'GET',
        headers: apiConfig.headers?.reduce((acc: Record<string, string>, header: any) => {
          acc[header.key] = header.value
          return acc
        }, {}) || {},
      }

      // Add authentication headers if configured
      if (apiConfig.authType === 'bearer' && apiConfig.authConfig?.token) {
        apiRequest.headers['Authorization'] = `Bearer ${apiConfig.authConfig.token}`
      } else if (apiConfig.authType === 'basic' && apiConfig.authConfig?.username && apiConfig.authConfig?.password) {
        const credentials = btoa(`${apiConfig.authConfig.username}:${apiConfig.authConfig.password}`)
        apiRequest.headers['Authorization'] = `Basic ${credentials}`
      } else if (apiConfig.authType === 'api_key' && apiConfig.authConfig?.key && apiConfig.authConfig?.value) {
        apiRequest.headers[apiConfig.authConfig.key] = apiConfig.authConfig.value
      }

      console.log(`[v0] Testing API connection to: ${apiRequest.url}`)

      const result = await executor.execute(apiRequest)

      if (result.success && result.data) {
        setTestResult(result.data)

        // Auto-detect fields from response
        const fields = extractFields(result.data)
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
      } else {
        throw new Error(result.error || "API request failed")
      }
    } catch (error) {
      console.error("[v0] API test failed:", error)
      
      let errorMessage = "Failed to connect to API. Please check your configuration."
      
      if (error instanceof Error) {
        const message = error.message
        
        // Handle specific HTTP status codes with user-friendly messages
        if (message.startsWith("HTTP 403")) {
          errorMessage = "API access denied (403). Please check your API key, authentication credentials, or subscription status."
        } else if (message.startsWith("HTTP 429")) {
          errorMessage = "Too many requests (429). The API rate limit has been exceeded. Please wait a few minutes and try again."
        } else if (message.startsWith("HTTP 401")) {
          errorMessage = "Authentication failed (401). Please verify your API credentials."
        } else if (message.startsWith("HTTP 404")) {
          errorMessage = "API endpoint not found (404). Please check the URL and try again."
        } else if (message.startsWith("HTTP 500") || message.startsWith("HTTP 502") || message.startsWith("HTTP 503")) {
          errorMessage = "Server error. The API service may be temporarily unavailable. Please try again later."
        } else if (message.startsWith("HTTP 4")) {
          errorMessage = `Client error (${message.split(":")[0].split(" ")[1]}). Please check your request configuration.`
        } else if (message.startsWith("HTTP 5")) {
          errorMessage = "Server error. The API service may be temporarily unavailable. Please try again later."
        } else {
          errorMessage = message
        }
      }
      
      setTestError(errorMessage)
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

  // Filter and search logic
  const filteredFields = useMemo(() => {
    let filtered = data.selectedFields

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(field =>
        field.sourcePath.toLowerCase().includes(searchQuery.toLowerCase()) ||
        field.targetField.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter(field => field.dataType === filterType)
    }

    // Apply selection filter
    if (showOnlySelected) {
      filtered = filtered.filter(field => field.isSelected)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "sourcePath":
          return a.sourcePath.localeCompare(b.sourcePath)
        case "targetField":
          return a.targetField.localeCompare(b.targetField)
        case "dataType":
          return a.dataType.localeCompare(b.dataType)
        case "selected":
          return Number(b.isSelected) - Number(a.isSelected)
        default:
          return 0
      }
    })

    return filtered
  }, [data.selectedFields, searchQuery, filterType, showOnlySelected, sortBy])

  // Bulk operations
  const bulkUpdateDataType = (dataType: string) => {
    const selectedIndices = data.selectedFields
      .map((field, index) => field.isSelected ? index : -1)
      .filter(index => index !== -1)

    const newFields = [...data.selectedFields]
    selectedIndices.forEach(index => {
      newFields[index].dataType = dataType
    })
    onChange({ ...data, selectedFields: newFields })
  }

  const duplicateSelectedFields = () => {
    const selectedFields = data.selectedFields.filter(field => field.isSelected)
    const duplicatedFields = selectedFields.map(field => ({
      ...field,
      targetField: `${field.targetField}_copy`,
      isSelected: true
    }))

    onChange({
      ...data,
      selectedFields: [...data.selectedFields, ...duplicatedFields]
    })
  }

  const removeSelectedFields = () => {
    const newFields = data.selectedFields.filter(field => !field.isSelected)
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
            <Button onClick={testApiConnection} disabled={isTestingApi || !apiConfig.baseUrl || (Date.now() - lastTestTime) < 2000} className="gap-2">
              {isTestingApi ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (Date.now() - lastTestTime) < 2000 ? (
                <>
                  <Clock className="h-4 w-4" />
                  Wait...
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
              <div className="flex items-center justify-between mb-2">
                <Label className="block">API Response Preview</Label>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{detectedFields.length} fields detected</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTestResult(null)}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <ScrollArea className={`w-full rounded-md border bg-muted/50 ${
                JSON.stringify(testResult, null, 2).length > 1000 ? 'h-64' :
                JSON.stringify(testResult, null, 2).length > 500 ? 'h-48' : 'h-32'
              }`}>
                <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </ScrollArea>
              {detectedFields.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 mb-2">
                    <Database className="h-4 w-4" />
                    <span className="font-medium">Field Detection Summary</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Total Fields:</span>
                      <span className="font-medium ml-1">{detectedFields.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">String Fields:</span>
                      <span className="font-medium ml-1">
                        {detectedFields.filter(f => f.type === 'string').length}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Number Fields:</span>
                      <span className="font-medium ml-1">
                        {detectedFields.filter(f => f.type === 'number').length}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nested Objects:</span>
                      <span className="font-medium ml-1">
                        {detectedFields.filter(f => f.path.includes('.')).length}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Mapping */}
      {data.selectedFields.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Field Mapping
                </CardTitle>
                <CardDescription>Select fields to extract and map them to your database columns</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {data.selectedFields.filter((f) => f.isSelected).length} of {data.selectedFields.length} selected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 mb-6">
            {/* Table Name */}
            <div className="space-y-2">
              <Label htmlFor="tableName" className="text-sm font-medium">Target Table Name *</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="tableName"
                    placeholder="e.g., users_data, api_places_standardized"
                    value={data.tableName}
                    onChange={(e) => onChange({ ...data, tableName: e.target.value })}
                    className="pl-9 h-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChange({ ...data, tableName: "api_places_standardized" })}
                  className="shrink-0 h-9"
                >
                  Use Default
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Data will be stored in this table. Table will be created automatically if it doesn&apos;t exist.
              </p>
            </div>

            {/* Search and Filter Controls */}
            <div className="space-y-3">
              <div className="flex flex-col gap-3">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search fields by source path or target column..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full sm:w-32 h-9">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="string">String</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-36 h-9">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sourcePath">Source Path</SelectItem>
                      <SelectItem value="targetField">Target Column</SelectItem>
                      <SelectItem value="dataType">Data Type</SelectItem>
                      <SelectItem value="selected">Selection</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant={showOnlySelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowOnlySelected(!showOnlySelected)}
                    className="h-9 text-xs flex-1 sm:flex-none"
                  >
                    {showOnlySelected ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                    Selected Only
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Showing {filteredFields.length} of {data.selectedFields.length} fields
                {searchQuery && (
                  <span className="ml-2 text-blue-600">• Filtered by &quot;{searchQuery}&quot;</span>
                )}
              </div>
            </div>

            {/* Bulk Actions */}
            {data.selectedFields.some(f => f.isSelected) && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Bulk Actions</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select onValueChange={bulkUpdateDataType}>
                      <SelectTrigger className="w-full sm:w-32 h-8 text-xs">
                        <SelectValue placeholder="Set Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={duplicateSelectedFields} className="h-8 text-xs flex-1 sm:flex-none">
                      <Copy className="h-3 w-3 mr-1" />
                      Duplicate
                    </Button>
                    <Button variant="outline" size="sm" onClick={removeSelectedFields} className="h-8 text-xs text-destructive hover:text-destructive flex-1 sm:flex-none">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Field List */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <Label className="flex items-center gap-2">
                  Fields ({data.selectedFields.filter((f) => f.isSelected).length} selected)
                  {searchQuery && (
                    <Badge variant="outline" className="text-xs">
                      Filtered
                    </Badge>
                  )}
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newFields = data.selectedFields.map((f) => ({ ...f, isSelected: true }))
                      onChange({ ...data, selectedFields: newFields })
                    }}
                    className="text-xs flex-1 sm:flex-none"
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
                    className="text-xs flex-1 sm:flex-none"
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              {/* Field count warning */}
              {data.selectedFields.length > 20 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <AlertCircle className="h-4 w-4" />
                    <span>Large number of fields detected. Consider selecting only the fields you need.</span>
                  </div>
                </div>
              )}

              <div className="border rounded-lg divide-y max-h-[32rem] overflow-hidden flex flex-col">
                {/* Header - Hidden on mobile, shown on larger screens */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 p-2 bg-muted/50 text-xs font-medium text-muted-foreground flex-shrink-0">
                  <div className="col-span-1">Select</div>
                  <div className="col-span-4">Source Path</div>
                  <div className="col-span-4">Target Column</div>
                  <div className="col-span-3">Data Type</div>
                </div>

                {/* Field Rows */}
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className={`${
                    filteredFields.length > 20 ? 'h-[24rem]' :
                    filteredFields.length > 15 ? 'h-[20rem]' :
                    filteredFields.length > 10 ? 'h-[16rem]' :
                    filteredFields.length > 5 ? 'h-[12rem]' : 'h-[8rem]'
                  } transition-all duration-200`}>
                  {filteredFields.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No fields match your current filters</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery("")
                          setFilterType("all")
                          setShowOnlySelected(false)
                        }}
                        className="mt-2"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  ) : (
                    filteredFields.map((field, index) => {
                      const originalIndex = data.selectedFields.findIndex(f => f === field)
                      return (
                        <div
                          key={`${field.sourcePath}-${originalIndex}`}
                          className={`p-2 border-b last:border-b-0 ${!field.isSelected ? "opacity-50 bg-muted/20" : ""}`}
                        >
                          {/* Mobile Layout */}
                          <div className="md:hidden space-y-2">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={field.isSelected}
                                onCheckedChange={() => toggleFieldSelection(originalIndex)}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground mb-1">Source Path</div>
                                <code className="text-xs bg-muted px-2 py-1 rounded block truncate" title={field.sourcePath}>
                                  {field.sourcePath}
                                </code>
                              </div>
                              <Badge variant={field.isSelected ? "default" : "secondary"} className="text-xs shrink-0">
                                {field.dataType}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Target Column</div>
                                <Input
                                  value={field.targetField}
                                  onChange={(e) => updateFieldMapping(originalIndex, "targetField", e.target.value)}
                                  disabled={!field.isSelected}
                                  className="h-8 text-sm"
                                  placeholder="column_name"
                                />
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Data Type</div>
                                <Select
                                  value={field.dataType}
                                  onValueChange={(value) => updateFieldMapping(originalIndex, "dataType", value)}
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
                          </div>

                          {/* Desktop Layout */}
                          <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                            <div className="col-span-1">
                              <Checkbox
                                checked={field.isSelected}
                                onCheckedChange={() => toggleFieldSelection(originalIndex)}
                              />
                            </div>
                            <div className="col-span-4">
                              <div className="space-y-1">
                                <code className="text-xs bg-muted px-2 py-1 rounded block truncate" title={field.sourcePath}>
                                  {field.sourcePath}
                                </code>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {field.dataType}
                                  </Badge>
                                  {!field.isSelected && (
                                    <Badge variant="secondary" className="text-xs">
                                      Disabled
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="col-span-4">
                              <Input
                                value={field.targetField}
                                onChange={(e) => updateFieldMapping(originalIndex, "targetField", e.target.value)}
                                disabled={!field.isSelected}
                                className="h-8 text-sm"
                                placeholder="column_name"
                              />
                            </div>
                            <div className="col-span-3">
                              <Select
                                value={field.dataType}
                                onValueChange={(value) => updateFieldMapping(originalIndex, "dataType", value)}
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
                        </div>
                      )
                    })
                  )}
                </ScrollArea>
                </div>
              </div>
            </div>

            {/* Enhanced Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 bg-gradient-to-r from-muted/30 to-muted/50 rounded-lg border mt-4">
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {data.selectedFields.filter((f) => f.isSelected).length}
                </div>
                <div className="text-xs text-muted-foreground">Selected Fields</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {data.selectedFields.length}
                </div>
                <div className="text-xs text-muted-foreground">Total Fields</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {data.tableName ? "✓" : "✗"}
                </div>
                <div className="text-xs text-muted-foreground">Target Table</div>
                {data.tableName && (
                  <div className="text-xs font-medium text-blue-600 mt-1 truncate max-w-full">
                    {data.tableName}
                  </div>
                )}
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Deduplicate Records</p>
                  <p className="text-xs text-muted-foreground">Remove duplicate entries based on key fields</p>
                </div>
                <Checkbox className="ml-3 shrink-0" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Normalize Data</p>
                  <p className="text-xs text-muted-foreground">Apply data normalization rules</p>
                </div>
                <Checkbox className="ml-3 shrink-0" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Validate Schema</p>
                  <p className="text-xs text-muted-foreground">Validate data against schema before insert</p>
                </div>
                <Checkbox className="ml-3 shrink-0" defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Store Raw Data</p>
                  <p className="text-xs text-muted-foreground">Keep original API response for audit</p>
                </div>
                <Checkbox className="ml-3 shrink-0" defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
