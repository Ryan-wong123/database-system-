const { Pool } = require("pg");
const { MongoClient } = require("mongodb");
const mongoose = require("mongoose");
require("dotenv").config();

const  pgPool  = new Pool({
  host: process.env.PG_HOST || "127.0.0.1",
  port: process.env.PG_LOCAL_PORT || 5433,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE
});

pgPool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL (via Pool)"))
  .catch(err => console.error("❌ PostgreSQL connection error:", err));



// Mongo Connection
let mongoClient;
let mongoDb;

async function connectMongo() {
  if (mongoDb) return mongoDb; // reuse existing connection

  try {
    mongoClient = new MongoClient(process.env.MONGO_URI);
    await mongoClient.connect();
    mongoDb = mongoClient.db(process.env.MONGO_DBNAME);
    return mongoDb;
  } catch (err) {
    throw err;
  }
}


async function connectMongoose() {
  if (mongoose.connection.readyState) return mongoose.connection;
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DBNAME || "inventory",
    });
    return mongoose.connection;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  pgPool,
  connectMongo,
  connectMongoose,
};