'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, X, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Connection {
  _id: string
  connectionId: string
  name: string
  description: string
  baseUrl: string
  method: string
  headers?: Record<string, string>
  authType: string
  isActive: boolean
  createdAt: string
}

export default function EditConnectionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [connection, setConnection] = useState<Connection | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    baseUrl: '',
    method: 'GET',
    authType: 'none',
    isActive: true,
    headers: {} as Record<string, string>
  })

  const [headerEntries, setHeaderEntries] = useState<Array<{key: string, value: string}>>([])

  useEffect(() => {
    const fetchConnection = async () => {
      try {
        setLoading(true)
        const resolvedParams = await params
        const connectionId = resolvedParams.id
        
        console.log('[v0] Fetching connection for edit:', connectionId)
        
        const response = await fetch(`/api/connections/${connectionId}`)
        if (!response.ok) {
          throw new Error('Connection not found')
        }
        
        const connectionData = await response.json()
        setConnection(connectionData)
        
        // Populate form with existing data
        setFormData({
          name: connectionData.name || '',
          description: connectionData.description || '',
          baseUrl: connectionData.baseUrl || '',
          method: connectionData.method || 'GET',
          authType: connectionData.authType || 'none',
          isActive: connectionData.isActive ?? true,
          headers: connectionData.headers || {}
        })
        
        // Convert headers to array for editing
        if (connectionData.headers) {
          const entries = Object.entries(connectionData.headers).map(([key, value]) => ({
            key, 
            value: String(value)
          }))
          setHeaderEntries(entries)
        }
        
      } catch (err) {
        console.error('[v0] Error fetching connection:', err)
        setError(err instanceof Error ? err.message : 'Failed to load connection')
      } finally {
        setLoading(false)
      }
    }

    fetchConnection()
  }, [params])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddHeader = () => {
    setHeaderEntries(prev => [...prev, { key: '', value: '' }])
  }

  const handleHeaderChange = (index: number, field: 'key' | 'value', value: string) => {
    setHeaderEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    ))
  }

  const handleRemoveHeader = (index: number) => {
    setHeaderEntries(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!connection) return
    
    try {
      setSaving(true)
      setError(null)
      
      // Convert header entries back to object
      const headers: Record<string, string> = {}
      headerEntries.forEach(entry => {
        if (entry.key.trim() && entry.value.trim()) {
          headers[entry.key.trim()] = entry.value.trim()
        }
      })
      
      const updateData = {
        ...formData,
        headers
      }
      
      console.log('[v0] Updating connection:', connection.connectionId, updateData)
      
      const response = await fetch(`/api/connections/${connection.connectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update connection')
      }
      
      const updatedConnection = await response.json()
      console.log('[v0] Connection updated successfully:', updatedConnection)
      
      toast.success('Connection updated successfully!')
      
      // Redirect back to connection details
      router.push(`/connections/${connection.connectionId}`)
      
    } catch (err) {
      console.error('[v0] Error updating connection:', err)
      setError(err instanceof Error ? err.message : 'Failed to update connection')
      toast.error('Failed to update connection')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading connection...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Link href="/connections">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Connections
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!connection) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Connection not found</p>
            <Link href="/connections">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Connections
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/connections/${connection.connectionId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Connection</h1>
            <p className="text-muted-foreground">{connection.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href={`/connections/${connection.connectionId}`}>
            <Button variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </Link>
          <Button 
            onClick={handleSave}
            disabled={saving}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Configure the basic connection settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Connection name"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Connection description"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                type="url"
                value={formData.baseUrl}
                onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                placeholder="https://api.example.com/v1"
              />
            </div>
            
            <div>
              <Label htmlFor="method">HTTP Method</Label>
              <Select 
                value={formData.method} 
                onValueChange={(value) => handleInputChange('method', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Authentication & Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication & Settings</CardTitle>
            <CardDescription>
              Configure authentication and connection settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="authType">Authentication Type</Label>
              <Select 
                value={formData.authType} 
                onValueChange={(value) => handleInputChange('authType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="basic">Basic Auth</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Status</Label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="isActive" className="font-normal">
                  Connection is active
                </Label>
              </div>
            </div>
            
            <div>
              <Label>Connection ID</Label>
              <div className="mt-2">
                <Badge variant="outline">{connection.connectionId}</Badge>
              </div>
            </div>
            
            <div>
              <Label>Created</Label>
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">
                  {new Date(connection.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Headers */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>HTTP Headers</CardTitle>
                <CardDescription>
                  Configure custom headers for API requests
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddHeader}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Header
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {headerEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No headers configured</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddHeader}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Header
                  </Button>
                </div>
              ) : (
                headerEntries.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Header name (e.g., Authorization)"
                      value={entry.key}
                      onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Header value"
                      value={entry.value}
                      onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveHeader(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
