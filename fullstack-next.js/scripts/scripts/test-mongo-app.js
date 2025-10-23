"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const mongo_1 = require("../lib/mongo");
async function testMongo() {
    try {
        const db = await (0, mongo_1.getDb)();
        console.log('✅ MongoDB connected successfully!');
        console.log('📊 Database:', db.databaseName);
        const collections = await db.listCollections().toArray();
        console.log('📁 Collections:', collections.length);
        process.exit(0);
    }
    catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
}
testMongo();
