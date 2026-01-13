const { MongoClient } = require("mongodb");

let db = null;

async function connectDB() {
  const client = new MongoClient("mongodb://127.0.0.1:27017");
  await client.connect();
  db = client.db("CSW2");
  console.log("Connected to MongoDB");
}

function getDB() {
  if (!db) {
    throw new Error("Database not connected");
  }
  return db;
}

module.exports = { connectDB, getDB };

