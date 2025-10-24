const { MongoClient } = require('mongodb');
require('dotenv').config();

async function createMonthlySchedule() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'dataplatform_db');

  console.log('[v0] Creating monthly Google Places API schedule...');

  // Create connection configuration
  const connectionConfig = {
    connectionId: 'monthly_google_places_restaurants',
    name: 'Monthly Sydney Restaurants Data',
    baseUrl: 'https://google-map-places.p.rapidapi.com/maps/api/place/textsearch/json',
    method: 'GET',
    headers: {
      'x-rapidapi-key': 'ffbaceaaeamsh9084aa32f4d5dfdp13028bjsn2366c1d9a5c9',
      'x-rapidapi-host': 'google-map-places.p.rapidapi.com'
    },
    parameters: {
      query: 'restaurants in Sydney',
      radius: '1000',
      opennow: 'true',
      location: '40,-110',
      language: 'en',
      region: 'en'
    },
    fieldMappings: [
      { sourcePath: '$.results[*].name', targetField: 'restaurant_name', dataType: 'string' },
      { sourcePath: '$.results[*].formatted_address', targetField: 'address', dataType: 'string' },
      { sourcePath: '$.results[*].rating', targetField: 'rating', dataType: 'number' },
      { sourcePath: '$.results[*].price_level', targetField: 'price_level', dataType: 'number' }
    ]
  };

  // Save connection config to api_metadata
  await db.collection('api_metadata').insertOne({
    type: 'connection',
    connectionId: connectionConfig.connectionId,
    name: connectionConfig.name,
    config: connectionConfig,
    isActive: true,
    _insertedAt: new Date().toISOString()
  });

  // Create monthly schedule
  const scheduleConfig = {
    type: 'schedule',
    scheduleId: 'monthly_sydney_restaurants',
    name: 'Monthly Sydney Restaurants Update',
    connectionId: connectionConfig.connectionId,
    cronExpression: '0 0 1 * *', // 1st day of every month at midnight
    isActive: true,
    description: 'Monthly collection of restaurant data from Google Places API for Sydney',
    _insertedAt: new Date().toISOString()
  };

  await db.collection('api_metadata').insertOne(scheduleConfig);

  console.log('[v0] Monthly schedule created successfully!');
  console.log('[v0] Connection ID:', connectionConfig.connectionId);
  console.log('[v0] Schedule ID:', scheduleConfig.scheduleId);
  console.log('[v0] Cron expression: 0 0 1 * * (1st of every month at midnight)');

  // Verify the schedule was created
  const schedules = await db.collection('api_metadata').find({ type: 'schedule' }).toArray();
  console.log('[v0] Total schedules in database:', schedules.length);

  await client.close();
}

createMonthlySchedule().catch(console.error);
