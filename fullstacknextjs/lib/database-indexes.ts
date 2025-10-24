// Database Indexes Setup - Optimize query performance
import { getDb } from "./mongo"
import { CollectionManager } from "./database-schema"

export async function setupDatabaseIndexes() {
  try {
    const db = await getDb()
    const indexDefinitions = CollectionManager.getIndexDefinitions()

    for (const [collectionName, indexes] of Object.entries(indexDefinitions)) {
      const collection = db.collection(collectionName)

      for (const indexDef of indexes) {
        try {
          await collection.createIndex(indexDef.key, { name: indexDef.name, ...indexDef })
        } catch (error) {
          // Index might already exist, continue
        }
      }
    }
  } catch (error) {
    console.error("Failed to setup database indexes:", error)
  }
}

export async function getCollectionStats() {
  try {
    const db = await getDb()
    const stats = {}

    for (const collName of ["api_data", "api_uploads", "api_metadata"]) {
      const collection = db.collection(collName)
      const count = await collection.countDocuments()
      const indexes = await collection.listIndexes().toArray()

      stats[collName] = {
        documentCount: count,
        indexes: indexes.map((idx) => idx.name),
      }
    }

    return stats
  } catch (error) {
    console.error("Failed to get collection stats:", error)
    return {}
  }
}
