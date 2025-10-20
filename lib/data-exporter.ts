// Data Export Handler - Export data to various formats (CSV, JSON, Parquet)
import { getDb } from "./mongo"
import { CollectionManager } from "./database-schema"

export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'parquet'

export interface ExportConfig {
  format: ExportFormat
  includeHeaders?: boolean
  delimiter?: string // For CSV
  pretty?: boolean // For JSON
  compression?: boolean
  fields?: string[] // Select specific fields
  limit?: number
  filter?: Record<string, any>
}

export interface ExportResult {
  exportId: string
  format: ExportFormat
  fileName: string
  content: string | Buffer
  size: number
  recordCount: number
  timestamp: Date
}

export class DataExporter {
  // Export data to CSV format
  static async exportToCSV(
    records: Record<string, any>[],
    config: ExportConfig = { format: 'csv' }
  ): Promise<string> {
    if (records.length === 0) {
      return ''
    }

    const delimiter = config.delimiter || ','
    const fields = config.fields || Object.keys(records[0])

    // Build header row
    const header = config.includeHeaders !== false
      ? fields.map(f => `"${f}"`).join(delimiter) + '\n'
      : ''

    // Build data rows
    const rows = records.map(record => {
      return fields.map(field => {
        const value = record[field]
        if (value === null || value === undefined) {
          return ''
        }
        // Escape quotes and wrap in quotes if contains delimiter or quotes
        const stringValue = String(value)
        if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(delimiter)
    }).join('\n')

    return header + rows
  }

  // Export data to JSON format
  static async exportToJSON(
    records: Record<string, any>[],
    config: ExportConfig = { format: 'json' }
  ): Promise<string> {
    const fields = config.fields
    
    // Filter fields if specified
    const filteredRecords = fields
      ? records.map(record => {
          const filtered: Record<string, any> = {}
          fields.forEach(field => {
            if (field in record) {
              filtered[field] = record[field]
            }
          })
          return filtered
        })
      : records

    return config.pretty
      ? JSON.stringify(filteredRecords, null, 2)
      : JSON.stringify(filteredRecords)
  }

  // Export data to Excel format (stub - requires additional library)
  static async exportToExcel(
    records: Record<string, any>[],
    config: ExportConfig = { format: 'xlsx' }
  ): Promise<Buffer> {
    // TODO: Implement Excel export using 'xlsx' library
    // const XLSX = require('xlsx')
    // const worksheet = XLSX.utils.json_to_sheet(records)
    // const workbook = XLSX.utils.book_new()
    // XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
    // return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    
    throw new Error('Excel export not yet implemented. Please use CSV or JSON format.')
  }

  // Export data to Parquet format (stub - requires additional library)
  static async exportToParquet(
    records: Record<string, any>[],
    config: ExportConfig = { format: 'parquet' }
  ): Promise<Buffer> {
    // TODO: Implement Parquet export using 'parquetjs' library
    throw new Error('Parquet export not yet implemented. Please use CSV or JSON format.')
  }

  // Main export function
  static async export(
    collectionName: string,
    config: ExportConfig
  ): Promise<ExportResult> {
    const exportId = Math.random().toString(36).substr(2, 16)
    const timestamp = new Date()

    console.log(`[v0] Exporting data from ${collectionName} to ${config.format}`)

    try {
      const db = await getDb()
      const collection = db.collection(collectionName)

      // Build query
      const query = config.filter || {}
      const limit = config.limit || 10000 // Default limit to prevent memory issues

      // Fetch data
      let cursor = collection.find(query)
      
      if (config.limit) {
        cursor = cursor.limit(config.limit)
      }

      const records = await cursor.toArray()

      // Remove MongoDB _id field
      const cleanRecords = records.map(r => {
        const { _id, ...rest } = r
        return rest
      })

      console.log(`[v0] Fetched ${cleanRecords.length} records for export`)

      // Export based on format
      let content: string | Buffer
      let fileName: string

      switch (config.format) {
        case 'csv':
          content = await this.exportToCSV(cleanRecords, config)
          fileName = `export_${exportId}_${timestamp.getTime()}.csv`
          break

        case 'json':
          content = await this.exportToJSON(cleanRecords, config)
          fileName = `export_${exportId}_${timestamp.getTime()}.json`
          break

        case 'xlsx':
          content = await this.exportToExcel(cleanRecords, config)
          fileName = `export_${exportId}_${timestamp.getTime()}.xlsx`
          break

        case 'parquet':
          content = await this.exportToParquet(cleanRecords, config)
          fileName = `export_${exportId}_${timestamp.getTime()}.parquet`
          break

        default:
          throw new Error(`Unsupported export format: ${config.format}`)
      }

      const size = typeof content === 'string' ? content.length : content.byteLength

      console.log(`[v0] Export completed: ${fileName} (${size} bytes)`)

      // Save export metadata to database
      await this.saveExportMetadata({
        exportId,
        format: config.format,
        fileName,
        size,
        recordCount: cleanRecords.length,
        timestamp,
        collectionName,
        config
      })

      return {
        exportId,
        format: config.format,
        fileName,
        content,
        size,
        recordCount: cleanRecords.length,
        timestamp
      }
    } catch (error) {
      console.error('[v0] Export error:', error)
      throw error
    }
  }

  // Export data from a specific connection
  static async exportConnectionData(
    connectionId: string,
    config: ExportConfig
  ): Promise<ExportResult> {
    // Export transformed data for this connection
    const filter = {
      ...config.filter,
      type: 'transformed_data',
      connectionId: connectionId
    }

    return this.export(CollectionManager.getCollectionName('DATA'), {
      ...config,
      filter
    })
  }

  // Export data from a specific run
  static async exportRunData(
    runId: string,
    config: ExportConfig
  ): Promise<ExportResult> {
    const db = await getDb()
    
    // First get the run to find connectionId
    const runsCollection = db.collection(CollectionManager.getCollectionName('DATA'))
    const run = await runsCollection.findOne({ 
      type: 'run',
      runId: runId 
    })

    if (!run) {
      throw new Error(`Run not found: ${runId}`)
    }

    // Export transformed data for this run
    const filter = {
      ...config.filter,
      type: 'transformed_data',
      connectionId: run.connectionId,
      runId: runId
    }

    return this.export(CollectionManager.getCollectionName('DATA'), {
      ...config,
      filter
    })
  }

  // Save export metadata
  private static async saveExportMetadata(metadata: any): Promise<void> {
    try {
      const db = await getDb()
      const collection = db.collection('api_data_exports')

      await collection.insertOne(metadata)
    } catch (error) {
      console.error('[v0] Error saving export metadata:', error)
    }
  }

  // Get export history
  static async getExportHistory(
    connectionId?: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const db = await getDb()
      const collection = db.collection('api_data_exports')

      const query = connectionId ? { 'config.filter._connectionId': connectionId } : {}

      const exports = await collection
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray()

      return exports.map(e => ({
        exportId: e.exportId,
        format: e.format,
        fileName: e.fileName,
        size: e.size,
        recordCount: e.recordCount,
        timestamp: e.timestamp
      }))
    } catch (error) {
      console.error('[v0] Error fetching export history:', error)
      return []
    }
  }
}
