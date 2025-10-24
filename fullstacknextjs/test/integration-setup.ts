import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongoClient } from 'mongodb'
import Redis from 'ioredis'

let mongoServer: MongoMemoryServer
let mongoClient: MongoClient
let redisClient: Redis

beforeAll(async () => {
  // Setup MongoDB Memory Server
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()

  mongoClient = new MongoClient(mongoUri)
  await mongoClient.connect()

  // Setup Redis (using a mock or in-memory version for tests)
  redisClient = new Redis()

  // Set environment variables
  process.env.MONGODB_URI = mongoUri
  process.env.MONGODB_DB = 'testdb'
  process.env.REDIS_URL = 'redis://localhost:6379'
}, 60000)

afterAll(async () => {
  await mongoClient.close()
  await mongoServer.stop()
  await redisClient.quit()
}, 60000)
