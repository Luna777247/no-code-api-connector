/**
 * Optimize data for storage by removing unnecessary fields
 */
export function optimizeDataForStorage<T extends Record<string, unknown>>(
  data: T,
  fieldsToKeep?: (keyof T)[],
): Partial<T> {
  if (!fieldsToKeep) {
    return data
  }

  const optimized: Partial<T> = {}
  for (const field of fieldsToKeep) {
    if (field in data) {
      optimized[field] = data[field]
    }
  }
  return optimized
}

/**
 * Compress data for transmission
 */
export async function compressData(data: unknown): Promise<Uint8Array> {
  const json = JSON.stringify(data)
  const encoder = new TextEncoder()
  const buffer = encoder.encode(json)

  // Use CompressionStream if available (modern browsers)
  if ("CompressionStream" in globalThis) {
    const stream = new (globalThis as any).CompressionStream("gzip")
    const writer = stream.writable.getWriter()
    writer.write(buffer)
    writer.close()

    const reader = stream.readable.getReader()
    const chunks: Uint8Array[] = []
    let result = await reader.read()

    while (!result.done) {
      chunks.push(result.value)
      result = await reader.read()
    }

    return new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []))
  }

  // Fallback: return uncompressed
  return buffer
}

/**
 * Decompress data
 */
export async function decompressData(compressed: Uint8Array): Promise<unknown> {
  if ("DecompressionStream" in globalThis) {
    const stream = new (globalThis as any).DecompressionStream("gzip")
    const writer = stream.writable.getWriter()
    writer.write(compressed)
    writer.close()

    const reader = stream.readable.getReader()
    const chunks: Uint8Array[] = []
    let result = await reader.read()

    while (!result.done) {
      chunks.push(result.value)
      result = await reader.read()
    }

    const buffer = new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []))
    const decoder = new TextDecoder()
    const json = decoder.decode(buffer)
    return JSON.parse(json)
  }

  // Fallback: assume uncompressed
  const decoder = new TextDecoder()
  const json = decoder.decode(compressed)
  return JSON.parse(json)
}

/**
 * Paginate large datasets
 */
export function paginateData<T>(data: T[], page: number, pageSize: number): { data: T[]; total: number } {
  const start = (page - 1) * pageSize
  const end = start + pageSize
  return {
    data: data.slice(start, end),
    total: data.length,
  }
}

/**
 * Calculate storage size of data
 */
export function calculateStorageSize(data: unknown): {
  bytes: number
  kb: number
  mb: number
} {
  const bytes = JSON.stringify(data).length
  return {
    bytes,
    kb: Math.round(bytes / 1024),
    mb: Math.round(bytes / 1024 / 1024),
  }
}

/**
 * Estimate memory usage
 */
export function estimateMemoryUsage(): {
  used: number
  limit: number
  percentage: number
} {
  if (typeof performance !== "undefined" && (performance as any).memory) {
    const memory = (performance as any).memory
    return {
      used: memory.usedJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
    }
  }

  return {
    used: 0,
    limit: 0,
    percentage: 0,
  }
}
