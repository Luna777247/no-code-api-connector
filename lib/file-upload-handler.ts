// File Upload Handler - Handle CSV, Excel, JSON file uploads for data ingestion
import { getDb } from "./mongo"

export interface FileUploadConfig {
  fileType?: 'csv' | 'excel' | 'json' | 'xml'
  delimiter?: string // For CSV files
  sheetName?: string // For Excel files
  encoding?: string
  skipRows?: number
  maxRows?: number
}

export interface FileUploadResult {
  uploadId: string
  fileName: string
  fileSize: number
  recordCount: number
  schema: Record<string, string>
  preview: Record<string, any>[]
  errors: string[]
  status: 'success' | 'partial' | 'failed'
}

export class FileUploadHandler {
  // Parse CSV file
  static async parseCSV(
    content: string,
    config: FileUploadConfig = {}
  ): Promise<{
    records: Record<string, any>[]
    errors: string[]
  }> {
    const delimiter = config.delimiter || ','
    const skipRows = config.skipRows || 0
    const maxRows = config.maxRows

    const lines = content.split('\n').filter(line => line.trim())
    const errors: string[] = []

    if (lines.length < skipRows + 1) {
      return { records: [], errors: ['File is empty or has insufficient rows'] }
    }

    // Get headers
    const headerLine = lines[skipRows]
    const headers = headerLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''))

    // Parse data rows
    const records: Record<string, any>[] = []
    const dataLines = maxRows 
      ? lines.slice(skipRows + 1, skipRows + 1 + maxRows)
      : lines.slice(skipRows + 1)

    dataLines.forEach((line, index) => {
      try {
        const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''))
        
        if (values.length !== headers.length) {
          errors.push(`Row ${index + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`)
          return
        }

        const record: Record<string, any> = {}
        headers.forEach((header, i) => {
          // Try to infer data type
          const value = values[i]
          if (value === '') {
            record[header] = null
          } else if (!isNaN(Number(value))) {
            record[header] = Number(value)
          } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
            record[header] = value.toLowerCase() === 'true'
          } else {
            record[header] = value
          }
        })

        records.push(record)
      } catch (error) {
        errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : String(error)}`)
      }
    })

    return { records, errors }
  }

  // Parse JSON file
  static async parseJSON(
    content: string
  ): Promise<{
    records: Record<string, any>[]
    errors: string[]
  }> {
    const errors: string[] = []

    try {
      const parsed = JSON.parse(content)
      
      if (Array.isArray(parsed)) {
        return { records: parsed, errors: [] }
      } else if (typeof parsed === 'object' && parsed !== null) {
        // If single object, wrap in array
        return { records: [parsed], errors: [] }
      } else {
        return { records: [], errors: ['Invalid JSON structure: expected array or object'] }
      }
    } catch (error) {
      errors.push(`JSON parse error: ${error instanceof Error ? error.message : String(error)}`)
      return { records: [], errors }
    }
  }

  // Parse Excel file (stub - requires additional library like xlsx)
  static async parseExcel(
    content: Buffer,
    config: FileUploadConfig = {}
  ): Promise<{
    records: Record<string, any>[]
    errors: string[]
  }> {
    // TODO: Implement Excel parsing using 'xlsx' library
    // const XLSX = require('xlsx')
    // const workbook = XLSX.read(content)
    // const sheetName = config.sheetName || workbook.SheetNames[0]
    // const worksheet = workbook.Sheets[sheetName]
    // const records = XLSX.utils.sheet_to_json(worksheet)
    
    return {
      records: [],
      errors: ['Excel parsing not yet implemented. Please use CSV or JSON format.']
    }
  }

  // Process uploaded file
  static async processUpload(
    fileName: string,
    fileContent: string | Buffer,
    fileType: FileUploadConfig['fileType'],
    connectionId: string,
    config: FileUploadConfig = {}
  ): Promise<FileUploadResult> {
    const uploadId = Math.random().toString(36).substr(2, 16)
    const fileSize = typeof fileContent === 'string' ? fileContent.length : fileContent.byteLength

    console.log(`[v0] Processing file upload: ${fileName} (${fileType})`)

    let records: Record<string, any>[] = []
    let errors: string[] = []

    // Parse based on file type
    switch (fileType) {
      case 'csv':
        const csvResult = await this.parseCSV(fileContent as string, config)
        records = csvResult.records
        errors = csvResult.errors
        break

      case 'json':
        const jsonResult = await this.parseJSON(fileContent as string)
        records = jsonResult.records
        errors = jsonResult.errors
        break

      case 'excel':
        const excelResult = await this.parseExcel(fileContent as Buffer, config)
        records = excelResult.records
        errors = excelResult.errors
        break

      default:
        errors.push(`Unsupported file type: ${fileType}`)
    }

    // Infer schema
    const schema = records.length > 0 ? this.inferSchema(records[0]) : {}

    // Get preview (first 5 records)
    const preview = records.slice(0, 5)

    // Determine status
    let status: 'success' | 'partial' | 'failed' = 'success'
    if (errors.length > 0) {
      status = records.length > 0 ? 'partial' : 'failed'
    }

    const result: FileUploadResult = {
      uploadId,
      fileName,
      fileSize,
      recordCount: records.length,
      schema,
      preview,
      errors,
      status
    }

    // Save to database
    if (records.length > 0) {
      try {
        await this.saveToDatabase(uploadId, connectionId, fileName, records, result)
      } catch (error) {
        errors.push(`Database save error: ${error instanceof Error ? error.message : String(error)}`)
        status = 'partial'
      }
    }

    console.log(`[v0] File upload processed: ${status} (${records.length} records, ${errors.length} errors)`)

    return { ...result, status }
  }

  // Save uploaded data to database
  private static async saveToDatabase(
    uploadId: string,
    connectionId: string,
    fileName: string,
    records: Record<string, any>[],
    metadata: FileUploadResult
  ): Promise<void> {
    const db = await getDb()

    // Save upload metadata
    const uploadsCollection = db.collection('api_file_uploads')
    await uploadsCollection.insertOne({
      uploadId,
      connectionId,
      fileName,
      fileSize: metadata.fileSize,
      recordCount: metadata.recordCount,
      schema: metadata.schema,
      status: metadata.status,
      errors: metadata.errors,
      uploadedAt: new Date()
    })

    // Save actual data to raw zone
    const dataCollection = db.collection('api_data_raw')
    await dataCollection.insertMany(
      records.map(record => ({
        ...record,
        _uploadId: uploadId,
        _connectionId: connectionId,
        _fileName: fileName,
        _source: 'file_upload',
        _insertedAt: new Date()
      }))
    )

    console.log(`[v0] Saved ${records.length} records to database (uploadId: ${uploadId})`)
  }

  // Get upload history
  static async getUploadHistory(
    connectionId?: string,
    limit: number = 50
  ): Promise<FileUploadResult[]> {
    try {
      const db = await getDb()
      const collection = db.collection('api_file_uploads')

      const query = connectionId ? { connectionId } : {}

      const uploads = await collection
        .find(query)
        .sort({ uploadedAt: -1 })
        .limit(limit)
        .toArray()

      return uploads.map(u => ({
        uploadId: u.uploadId,
        fileName: u.fileName,
        fileSize: u.fileSize,
        recordCount: u.recordCount,
        schema: u.schema,
        preview: [],
        errors: u.errors || [],
        status: u.status
      }))
    } catch (error) {
      console.error('[v0] Error fetching upload history:', error)
      return []
    }
  }

  // Get data from a specific upload
  static async getUploadData(
    uploadId: string,
    limit: number = 100,
    skip: number = 0
  ): Promise<Record<string, any>[]> {
    try {
      const db = await getDb()
      const collection = db.collection('api_data_raw')

      const data = await collection
        .find({ _uploadId: uploadId })
        .skip(skip)
        .limit(limit)
        .toArray()

      return data.map(d => {
        const { _id, _uploadId, _connectionId, _fileName, _source, _insertedAt, ...rest } = d
        return rest
      })
    } catch (error) {
      console.error('[v0] Error fetching upload data:', error)
      return []
    }
  }

  // Helper: Infer schema from a record
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

  // Validate CSV file structure before processing
  static async validateCSV(
    content: string,
    expectedHeaders?: string[]
  ): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    headerCount: number
    rowCount: number
  }> {
    const lines = content.split('\n').filter(line => line.trim())
    const errors: string[] = []
    const warnings: string[] = []

    if (lines.length === 0) {
      errors.push('File is empty')
      return { isValid: false, errors, warnings, headerCount: 0, rowCount: 0 }
    }

    // Check headers
    const headerLine = lines[0]
    const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const headerCount = headers.length

    if (headerCount === 0) {
      errors.push('No headers found')
      return { isValid: false, errors, warnings, headerCount: 0, rowCount: 0 }
    }

    // Check for duplicate headers
    const uniqueHeaders = new Set(headers)
    if (uniqueHeaders.size !== headers.length) {
      errors.push('Duplicate headers found')
    }

    // Check expected headers if provided
    if (expectedHeaders && expectedHeaders.length > 0) {
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h))
      if (missingHeaders.length > 0) {
        errors.push(`Missing expected headers: ${missingHeaders.join(', ')}`)
      }
    }

    // Check row consistency
    const rowCount = lines.length - 1
    if (rowCount === 0) {
      warnings.push('No data rows found')
    }

    // Sample check first 10 rows for column count
    const sampleSize = Math.min(10, rowCount)
    for (let i = 1; i <= sampleSize; i++) {
      const columnCount = lines[i].split(',').length
      if (columnCount !== headerCount) {
        warnings.push(`Row ${i}: Column count mismatch (expected ${headerCount}, got ${columnCount})`)
      }
    }

    const isValid = errors.length === 0

    return {
      isValid,
      errors,
      warnings,
      headerCount,
      rowCount
    }
  }
}
