'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export function ReviewStep({ data }) {
  const { apiConfig, parameters, dataMapping, schedule } = data || {}

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Configuration</CardTitle>
          <CardDescription>Endpoint, method và xác thực</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-muted-foreground">Name</div>
              <div className="font-medium break-all">{apiConfig?.name || '-'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Method</div>
              <div className="font-medium">{apiConfig?.method || 'GET'}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-muted-foreground">Base URL</div>
              <div className="font-mono text-xs bg-muted px-2 py-1 rounded break-all">{apiConfig?.baseUrl || '-'}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-muted-foreground">Description</div>
              <div className="break-all">{apiConfig?.description || '-'}</div>
            </div>
          </div>
          <Separator className="my-2" />
          <div>
            <div className="text-muted-foreground mb-1">Headers</div>
            <div className="flex flex-wrap gap-2">
              {(apiConfig?.headers || []).length === 0 && (
                <span className="text-xs text-muted-foreground">No headers</span>
              )}
              {(apiConfig?.headers || []).map((h, idx) => (
                <Badge key={idx} variant="secondary" className="font-mono text-[11px]">
                  {h?.key}: {h?.value}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parameters</CardTitle>
          <CardDescription>Query, path, body parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(parameters || []).length === 0 ? (
            <div className="text-muted-foreground">No parameters</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(parameters || []).map((p, idx) => (
                <div key={idx} className="border rounded p-2">
                  <div className="font-medium">{p?.name}</div>
                  <div className="text-xs text-muted-foreground">{p?.type || 'query'}</div>
                  {p?.values && p.values.length > 0 && (
                    <div className="font-mono text-xs mt-1 truncate" title={String(p.values.join(', '))}>
                      {String(p.values.slice(0, 3).join(', '))}{p.values.length > 3 ? '...' : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Mapping</CardTitle>
          <CardDescription>Bảng đích và các cột ánh xạ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="text-muted-foreground">Target Table</div>
            <div className="font-medium">{dataMapping?.tableName || '-'}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Field Mappings</div>
            {(dataMapping?.selectedFields || []).length === 0 ? (
              <div className="text-muted-foreground">No fields selected</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(dataMapping?.selectedFields || []).map((f, idx) => (
                  <div key={idx} className="border rounded p-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-muted-foreground truncate" title={f?.sourcePath}>{f?.sourcePath}</div>
                      <div className="font-medium truncate" title={f?.targetField}>{f?.targetField}</div>
                    </div>
                    <Badge variant="secondary" className="text-[11px] shrink-0">{f?.dataType || 'string'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
          <CardDescription>Bật lịch chạy tự động</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant={schedule?.enabled ? 'default' : 'secondary'}>{schedule?.enabled ? 'Enabled' : 'Disabled'}</Badge>
            <div className="text-muted-foreground">{schedule?.type || 'daily'}</div>
          </div>
          {schedule?.cronExpression && (
            <div>
              <div className="text-muted-foreground">CRON</div>
              <div className="font-mono text-xs bg-muted px-2 py-1 rounded inline-block">{schedule.cronExpression}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
