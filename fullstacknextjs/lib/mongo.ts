import { MongoClient, Db } from "mongodb"

let client: MongoClient | null = null
let dbInstance: Db | null = null

export async function getDb(): Promise<Db> {
  if (dbInstance) return dbInstance

  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB || "dataplatform_db"

  if (!uri) throw new Error("MONGODB_URI is not set")

  client = new MongoClient(uri)
  await client.connect()
  dbInstance = client.db(dbName)

  console.log("[v0] Connected to MongoDB", dbName)
  return dbInstance
}

export async function closeDb() {
  if (client) {
    await client.close()
    client = null
    dbInstance = null
  }
}
