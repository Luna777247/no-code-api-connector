const { MongoClient } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

async function run() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB || 'smart_travel_v2'
  if (!uri) {
    console.error('MONGODB_URI not set')
    process.exit(1)
  }

  const client = new MongoClient(uri)
  try {
    await client.connect()
    console.log('[v0] Connected to MongoDB')
    const db = client.db(dbName)
    const coll = db.collection('api_data_transformed')
    const res = await coll.insertOne({ test: true, insertedAt: new Date() })
    console.log('[v0] Inserted document id:', res.insertedId)
  } catch (err) {
    console.error('Error connecting/inserting to MongoDB:', err)
    process.exitCode = 1
  } finally {
    await client.close()
  }
}

run()
