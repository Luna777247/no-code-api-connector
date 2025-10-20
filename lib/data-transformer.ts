// Data Transformer - Transforms API responses to database format
export interface FieldMapping {
  sourcePath: string
  targetField: string
  dataType: string
  transformRule?: string
}

export class DataTransformer {
  transform(data: any, mappings: FieldMapping[]): Record<string, any> {
    const transformed: Record<string, any> = {}

    mappings.forEach((mapping) => {
      const value = this.extractValue(data, mapping.sourcePath)
      const transformedValue = this.applyTransformation(value, mapping.dataType, mapping.transformRule)
      transformed[mapping.targetField] = transformedValue
    })

    return transformed
  }

  transformBatch(dataArray: any[], mappings: FieldMapping[]): Record<string, any>[] {
    console.log(`[v0] Transforming batch of ${dataArray.length} records`)
    return dataArray.map((data) => this.transform(data, mappings))
  }

  private extractValue(obj: any, path: string): any {
    // Remove leading $ if present
    const cleanPath = path.startsWith("$.") ? path.substring(2) : path

    // Handle array notation [*]
    if (cleanPath.includes('[*]')) {
      const [arrayPath, fieldPath] = cleanPath.split('[*].')
      const arrayValue = this.getValueByPath(obj, arrayPath)

      if (Array.isArray(arrayValue) && arrayValue.length > 0) {
        if (fieldPath) {
          // Extract field from all array items and join with comma
          const extractedValues = arrayValue
            .map(item => this.getValueByPath(item, fieldPath))
            .filter(val => val !== null && val !== undefined)
          return extractedValues.join(',')
        }
        // Return first item for single value extraction
        return arrayValue[0]
      }
      return null
    }

    // Regular path traversal
    return this.getValueByPath(obj, cleanPath)
  }

  private getValueByPath(obj: any, path: string): any {
    const keys = path.split(".")
    let value = obj

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key]
      } else {
        return null
      }
    }

    return value
  }

  private applyTransformation(value: any, dataType: string, transformRule?: string): any {
    if (value === null || value === undefined) return null

    switch (dataType) {
      case "number":
        return Number(value)
      case "boolean":
        return Boolean(value)
      case "date":
        return new Date(value).toISOString()
      case "json":
        return typeof value === "string" ? JSON.parse(value) : value
      case "string":
      default:
        return String(value)
    }
  }

  validateSchema(data: Record<string, any>, mappings: FieldMapping[]): boolean {
    return mappings.every((mapping) => {
      const value = data[mapping.targetField]
      if (value === null || value === undefined) return true

      switch (mapping.dataType) {
        case "number":
          return typeof value === "number" && !isNaN(value)
        case "boolean":
          return typeof value === "boolean"
        case "date":
          return !isNaN(Date.parse(value))
        case "string":
          return typeof value === "string"
        default:
          return true
      }
    })
  }
}
