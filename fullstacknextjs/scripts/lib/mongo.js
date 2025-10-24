"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.closeDb = closeDb;
const mongodb_1 = require("mongodb");
let client = null;
let dbInstance = null;
async function getDb() {
    if (dbInstance)
        return dbInstance;
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || "dataplatform_db";
    if (!uri)
        throw new Error("MONGODB_URI is not set");
    client = new mongodb_1.MongoClient(uri);
    await client.connect();
    dbInstance = client.db(dbName);
    console.log("[v0] Connected to MongoDB", dbName);
    return dbInstance;
}
async function closeDb() {
    if (client) {
        await client.close();
        client = null;
        dbInstance = null;
    }
}
