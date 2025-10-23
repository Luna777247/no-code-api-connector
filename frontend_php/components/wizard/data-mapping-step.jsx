'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Database, Search, Filter, ArrowUpDown, Loader2, Play, AlertCircle, CheckCircle2 } from 'lucide-react'
import apiClient from '../../services/apiClient.js'

export function DataMappingStep({ data, apiConfig, onChange }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('sourcePath')

  const selectedFields = data?.selectedFields || []

  const setSelectedFields = (fields) => onChange({ ...data, selectedFields: fields })

  const extractFields = (obj, prefix = '$') => {
    const out = []
    const visit = (val, path) => {
      if (val === null || val === undefined) return
      if (Array.isArray(val)) {
        if (val.length > 0) visit(val[0], path + '[0]')
        return
      }
      if (typeof val === 'object') {
        Object.keys(val).forEach((k) => visit(val[k], path + '.' + k))
      } else {
        out.push({
          path,
          suggestedName: String(path.split('.').pop() || 'field').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase(),
          type: typeof val === 'number' ? 'number' : typeof val === 'boolean' ? 'boolean' : /\d{4}-\d{2}-\d{2}/.test(String(val)) ? 'date' : 'string',
          sampleValue: val,
        })
      }
    }
    visit(obj, prefix)
    return out
  }

  const testAndDetect = async () => {
    setLoading(true)
    setError('')
    try {
      const headersObj = (apiConfig?.headers || []).reduce((acc, h) => {
        if (h && h.key) acc[h.key] = h.value || ''
        return acc
      }, {})
      const payload = {
        url: apiConfig?.baseUrl,
        method: apiConfig?.method || 'GET',
        headers: headersObj,
        body: undefined,
      }
      const res = await apiClient.post('/api/test-connection', payload)
      const body = res?.data?.body || res?.data || null
      let json
      try {
        json = typeof body === 'string' ? JSON.parse(body) : body
      } catch {
        json = body
      }
      setPreview(json)
      if (json && typeof json === 'object') {
        const fields = extractFields(json)
        if ((data?.selectedFields || []).length === 0) {
          setSelectedFields(
            fields.map((f) => ({
              sourcePath: f.path,
              targetField: f.suggestedName,
              dataType: f.type,
              isSelected: true,
            }))
          )
        }
      }
    } catch (e) {
      setError(e?.message || 'Failed to test connection')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let arr = [...selectedFields]
    if (search) {
      const q = search.toLowerCase()
      arr = arr.filter((f) => f.sourcePath.toLowerCase().includes(q) || f.targetField.toLowerCase().includes(q))
    }
    if (typeFilter !== 'all') arr = arr.filter((f) => f.dataType === typeFilter)
    arr.sort((a, b) => {
      if (sortBy === 'sourcePath') return a.sourcePath.localeCompare(b.sourcePath)
      if (sortBy === 'targetField') return a.targetField.localeCompare(b.targetField)
      if (sortBy === 'dataType') return a.dataType.localeCompare(b.dataType)
      return 0
    })
    return arr
  }, [selectedFields, search, typeFilter, sortBy])

  const updateRow = (idx, patch) => {
    const next = [...selectedFields]
    next[idx] = { ...next[idx], ...patch }
    setSelectedFields(next)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test API Connection</CardTitle>
          <CardDescription>Gọi thử endpoint để dò cấu trúc dữ liệu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Button onClick={testAndDetect} disabled={!apiConfig?.baseUrl || loading} className="gap-2">
              {loading ? (<><Loader2 className="h-4 w-4 animate-spin" />Đang kiểm tra...</>) : (<><Play className="h-4 w-4" />Test Connection</>)}
            </Button>
            {preview && !error && (
              <span className="flex items-center gap-1 text-green-600 text-sm"><CheckCircle2 className="h-4 w-4" />OK</span>
            )}
            {error && (
              <span className="flex items-center gap-1 text-destructive text-sm"><AlertCircle className="h-4 w-4" />{error}</span>
            )}
          </div>
          {preview && (
            <ScrollArea className="h-40 w-full rounded border bg-muted/40">
              <pre className="p-3 text-xs whitespace-pre-wrap break-all">{JSON.stringify(preview, null, 2)}</pre>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Field Mapping</CardTitle>
          <CardDescription>Chọn trường và map sang cột đích</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tableName">Target Table Name</Label>
            <Input id="tableName" value={data?.tableName || ''} onChange={(e) => onChange({ ...data, tableName: e.target.value })} placeholder="api_places_standardized" />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Tìm theo source/target" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="sm:col-span-1">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-1">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger><ArrowUpDown className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sourcePath">Source Path</SelectItem>
                  <SelectItem value="targetField">Target Field</SelectItem>
                  <SelectItem value="dataType">Data Type</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded border overflow-hidden">
            <div className="hidden md:grid md:grid-cols-12 gap-2 px-3 py-2 bg-muted/50 text-xs text-muted-foreground">
              <div className="col-span-1">Use</div>
              <div className="col-span-5">Source Path</div>
              <div className="col-span-4">Target Field</div>
              <div className="col-span-2">Type</div>
            </div>
            <ScrollArea className={`${filtered.length > 10 ? 'h-80' : 'h-auto'}`}>
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <Database className="h-6 w-6 mx-auto mb-2 opacity-60" />Không có trường nào
                </div>
              ) : filtered.map((f, i) => {
                const idx = selectedFields.findIndex((x) => x === f)
                return (
                  <div key={`row-${idx}`} className="grid md:grid-cols-12 gap-2 p-2 border-t first:border-t-0 items-center">
                    <div className="md:col-span-1">
                      <Checkbox checked={!!f.isSelected} onCheckedChange={(v) => updateRow(idx, { isSelected: !!v })} />
                    </div>
                    <div className="md:col-span-5">
                      <code className="text-xs bg-muted px-2 py-1 rounded block truncate" title={f.sourcePath}>{f.sourcePath}</code>
                    </div>
                    <div className="md:col-span-4">
                      <Input value={f.targetField} onChange={(e) => updateRow(idx, { targetField: e.target.value })} placeholder="column_name" />
                    </div>
                    <div className="md:col-span-2">
                      <Select value={f.dataType} onValueChange={(v) => updateRow(idx, { dataType: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )
              })}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
