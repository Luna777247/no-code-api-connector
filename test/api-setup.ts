import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongoClient } from 'mongodb'

let mongoServer: MongoMemoryServer
let mongoClient: MongoClient

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()

  mongoClient = new MongoClient(mongoUri)
  await mongoClient.connect()

  // Set environment variables
  process.env.MONGODB_URI = mongoUri
  process.env.MONGODB_DB = 'testdb'
}, 60000)

afterAll(async () => {
  await mongoClient.close()
  await mongoServer.stop()
}, 60000)