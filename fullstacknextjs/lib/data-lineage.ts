// Data Lineage Tracker - Tracks data flow and transformations
import { getDb } from "./mongo"

export interface LineageNode {
  id: string
  type: 'source' | 'transformation' | 'destination'
  name: string
  description?: string
  metadata?: Record<string, any>
}

export interface LineageEdge {
  from: string
  to: string
  type: 'extract' | 'transform' | 'load' | 'validate'
  timestamp: Date
  metadata?: Record<string, any>
}

export interface DataLineage {
  runId: string
  connectionId: string
  timestamp: Date
  nodes: LineageNode[]
  edges: LineageEdge[]
  metadata: {
    startTime: Date
    endTime?: Date
    duration?: number
    recordCount?: number
    status: 'running' | 'completed' | 'failed'
  }
}

export interface VersionInfo {
  version: number
  timestamp: Date
  changes: string[]
  author?: string
  metadata?: Record<string, any>
}

export interface DatasetVersion {
  datasetId: string
  connectionId: string
  version: number
  timestamp: Date
  recordCount: number
  schema: Record<string, any>
  checksum?: string
  metadata?: Record<string, any>
}

export class LineageTracker {
  private currentLineage: DataLineage | null = null

  // Start tracking lineage for a workflow run
  startTracking(runId: string, connectionId: string): void {
    this.currentLineage = {
      runId,
      connectionId,
      timestamp: new Date(),
      nodes: [],
      edges: [],
      metadata: {
        startTime: new Date(),
        status: 'running'
      }
    }

    console.log(`[v0] Lineage tracking started for run: ${runId}`)
  }

  // Add a node to the lineage graph
  addNode(node: LineageNode): void {
    if (!this.currentLineage) {
      console.warn('[v0] No active lineage tracking session')
      return
    }

    this.currentLineage.nodes.push(node)
  }

  // Add an edge (connection) between nodes
  addEdge(edge: Omit<LineageEdge, 'timestamp'>): void {
    if (!this.currentLineage) {
      console.warn('[v0] No active lineage tracking session')
      return
    }

    this.currentLineage.edges.push({
      ...edge,
      timestamp: new Date()
    })
  }

  // Track a source (API, file, database)
  trackSource(sourceId: string, sourceName: string, sourceType: string, metadata?: Record<string, any>): void {
    this.addNode({
      id: sourceId,
      type: 'source',
      name: sourceName,
      description: `${sourceType} data source`,
      metadata: {
        sourceType,
        ...metadata
      }
    })
  }

  // Track a transformation step
  trackTransformation(transformId: string, transformName: string, inputNodes: string[], metadata?: Record<string, any>): void {
    this.addNode({
      id: transformId,
      type: 'transformation',
      name: transformName,
      description: `Data transformation: ${transformName}`,
      metadata
    })

    // Add edges from input nodes to this transformation
    inputNodes.forEach(inputId => {
      this.addEdge({
        from: inputId,
        to: transformId,
        type: 'transform'
      })
    })
  }

  // Track a destination (database, file, API)
  trackDestination(destId: string, destName: string, destType: string, inputNodes: string[], metadata?: Record<string, any>): void {
    this.addNode({
      id: destId,
      type: 'destination',
      name: destName,
      description: `${destType} destination`,
      metadata: {
        destType,
        ...metadata
      }
    })

    // Add edges from input nodes to destination
    inputNodes.forEach(inputId => {
      this.addEdge({
        from: inputId,
        to: destId,
        type: 'load'
      })
    })
  }

  // Complete lineage tracking
  async completeTracking(status: 'completed' | 'failed', recordCount?: number): Promise<void> {
    if (!this.currentLineage) {
      console.warn('[v0] No active lineage tracking session')
      return
    }

    const endTime = new Date()
    this.currentLineage.metadata.endTime = endTime
    this.currentLineage.metadata.duration = endTime.getTime() - this.currentLineage.metadata.startTime.getTime()
    this.currentLineage.metadata.status = status
    this.currentLineage.metadata.recordCount = recordCount

    // Save to database
    try {
      await this.saveLineage(this.currentLineage)
      console.log(`[v0] Lineage tracking completed for run: ${this.currentLineage.runId}`)
    } catch (error) {
      console.error('[v0] Error saving lineage:', error)
    }

    this.currentLineage = null
  }

  // Save lineage to database
  private async saveLineage(lineage: DataLineage): Promise<void> {
    const db = await getDb()
    const collection = db.collection('api_metadata')

    await collection.insertOne({
      type: 'data_lineage',
      _connectionId: lineage.connectionId,
      _insertedAt: new Date().toISOString(),
      lineageData: {
        sourceId: lineage.runId,
        sourceType: 'workflow_run',
        targetId: lineage.connectionId,
        targetType: 'connection',
        transformationSteps: lineage.edges.map(edge => ({
          type: edge.type,
          timestamp: edge.timestamp,
          metadata: edge.metadata
        })),
        createdAt: lineage.timestamp.toISOString()
      }
    })
  }

  // Get lineage for a specific run
  static async getLineage(runId: string): Promise<DataLineage | null> {
    try {
      const db = await getDb()
      const collection = db.collection('api_metadata')

      const lineageDoc = await collection.findOne({ 
        type: 'data_lineage',
        'lineageData.sourceId': runId 
      })
      
      if (!lineageDoc) return null
      
      // Transform back to DataLineage format
      return {
        runId,
        connectionId: lineageDoc.lineageData.targetId,
        timestamp: new Date(lineageDoc.lineageData.createdAt),
        nodes: [], // Would need to reconstruct from edges
        edges: lineageDoc.lineageData.transformationSteps.map((step: any) => ({
          from: '', // Would need to reconstruct
          to: '',
          type: step.type,
          timestamp: new Date(step.timestamp),
          metadata: step.metadata
        })),
        metadata: {
          startTime: new Date(lineageDoc.lineageData.createdAt),
          status: 'completed',
          recordCount: 0
        }
      } as DataLineage
    } catch (error) {
      console.error('[v0] Error fetching lineage:', error)
      return null
    }
  }

  // Get all lineage for a connection
  static async getConnectionLineage(connectionId: string, limit: number = 50): Promise<DataLineage[]> {
    try {
      const db = await getDb()
      const collection = db.collection('api_data_lineage')

      const lineages = await collection
        .find({ connectionId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray()

      return lineages as unknown as DataLineage[]
    } catch (error) {
      console.error('[v0] Error fetching connection lineage:', error)
      return []
    }
  }

  // Trace data backwards from destination to source
  static async traceBackwards(destinationId: string, runId: string): Promise<LineageNode[]> {
    const lineage = await this.getLineage(runId)
    if (!lineage) return []

    const visited = new Set<string>()
    const path: LineageNode[] = []

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return
      visited.add(nodeId)

      const node = lineage.nodes.find(n => n.id === nodeId)
      if (node) {
        path.unshift(node)
        
        // Find all edges pointing to this node
        const incomingEdges = lineage.edges.filter(e => e.to === nodeId)
        incomingEdges.forEach(edge => traverse(edge.from))
      }
    }

    traverse(destinationId)
    return path
  }
}

export class DataVersioning {
  // Create a new version of a dataset
  static async createVersion(
    datasetId: string,
    connectionId: string,
    data: Record<string, any>[],
    changes: string[],
    author?: string
  ): Promise<number> {
    try {
      const db = await getDb()
      const versionsCollection = db.collection('api_data_versions')

      // Get the latest version number
      const latestVersion = await versionsCollection
        .findOne({ datasetId }, { sort: { version: -1 } })

      const newVersion = (latestVersion?.version || 0) + 1

      // Calculate schema
      const schema = data.length > 0 ? this.inferSchema(data[0]) : {}

      // Calculate checksum (simple hash for now)
      const checksum = this.calculateChecksum(data)

      // Create version document
      const versionDoc: DatasetVersion = {
        datasetId,
        connectionId,
        version: newVersion,
        timestamp: new Date(),
        recordCount: data.length,
        schema,
        checksum,
        metadata: {
          changes,
          author,
          dataPreview: data.slice(0, 3) // Store first 3 records as preview
        }
      }

      await versionsCollection.insertOne(versionDoc)

      // Store actual data in separate collection
      const dataCollection = db.collection(`api_data_v${newVersion}_${datasetId}`)
      if (data.length > 0) {
        await dataCollection.insertMany(data.map(d => ({
          ...d,
          _version: newVersion,
          _versionedAt: new Date()
        })))
      }

      console.log(`[v0] Created dataset version ${newVersion} for ${datasetId}`)
      return newVersion
    } catch (error) {
      console.error('[v0] Error creating version:', error)
      throw error
    }
  }

  // Get version history for a dataset
  static async getVersionHistory(datasetId: string, limit: number = 50): Promise<DatasetVersion[]> {
    try {
      const db = await getDb()
      const collection = db.collection('api_data_versions')

      const versions = await collection
        .find({ datasetId })
        .sort({ version: -1 })
        .limit(limit)
        .toArray()

      return versions as unknown as DatasetVersion[]
    } catch (error) {
      console.error('[v0] Error fetching version history:', error)
      return []
    }
  }

  // Get data for a specific version
  static async getVersionData(datasetId: string, version: number): Promise<Record<string, any>[]> {
    try {
      const db = await getDb()
      const collection = db.collection(`api_data_v${version}_${datasetId}`)

      const data = await collection.find({}).toArray()
      return data.map(d => {
        const { _id, _version, _versionedAt, ...rest } = d
        return rest
      })
    } catch (error) {
      console.error('[v0] Error fetching version data:', error)
      return []
    }
  }

  // Compare two versions
  static async compareVersions(
    datasetId: string,
    version1: number,
    version2: number
  ): Promise<{
    added: number
    removed: number
    modified: number
    schemaChanges: string[]
  }> {
    try {
      const db = await getDb()
      const versionsCollection = db.collection('api_data_versions')

      const v1Doc = await versionsCollection.findOne({ datasetId, version: version1 })
      const v2Doc = await versionsCollection.findOne({ datasetId, version: version2 })

      if (!v1Doc || !v2Doc) {
        throw new Error('Version not found')
      }

      // Compare record counts
      const added = Math.max(0, v2Doc.recordCount - v1Doc.recordCount)
      const removed = Math.max(0, v1Doc.recordCount - v2Doc.recordCount)
      const modified = 0 // TODO: Implement detailed diff

      // Compare schemas
      const schemaChanges = this.compareSchemas(v1Doc.schema, v2Doc.schema)

      return {
        added,
        removed,
        modified,
        schemaChanges
      }
    } catch (error) {
      console.error('[v0] Error comparing versions:', error)
      return { added: 0, removed: 0, modified: 0, schemaChanges: [] }
    }
  }

  // Helper: Infer schema from data
  private static inferSchema(record: Record<string, any>): Record<string, string> {
    const schema: Record<string, string> = {}
    
    for (const [key, value] of Object.entries(record)) {
      if (Array.isArray(value)) {
        schema[key] = 'array'
      } else if (value === null) {
        schema[key] = 'null'
      } else {
        schema[key] = typeof value
      }
    }

    return schema
  }

  // Helper: Calculate checksum
  private static calculateChecksum(data: Record<string, any>[]): string {
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }

  // Helper: Compare schemas
  private static compareSchemas(schema1: Record<string, string>, schema2: Record<string, string>): string[] {
    const changes: string[] = []

    const allKeys = new Set([...Object.keys(schema1), ...Object.keys(schema2)])

    allKeys.forEach(key => {
      if (!(key in schema1)) {
        changes.push(`Added field: ${key} (${schema2[key]})`)
      } else if (!(key in schema2)) {
        changes.push(`Removed field: ${key}`)
      } else if (schema1[key] !== schema2[key]) {
        changes.push(`Changed field type: ${key} (${schema1[key]} → ${schema2[key]})`)
      }
    })

    return changes
  }
}
