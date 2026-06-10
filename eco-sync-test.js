const { MongoClient } = require('mongodb');
const fs = require('fs');

// Parse .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf8');
let uri = '';
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts[0] && parts[0].trim() === 'MONGODB_URI') {
    uri = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

if (!uri) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const users = await db.collection('users').find({}).toArray();
    console.log('--- Users ---');
    users.forEach(u => {
      console.log({ id: u._id, username: u.username, name: u.name, email: u.email, role: u.role, companyName: u.companyName, companyId: u.companyId });
    });
    
    const trips = await db.collection('trips').find({}).limit(5).toArray();
    console.log('--- Trips ---');
    trips.forEach(t => {
      console.log({ id: t._id, tripId: t.tripId, companyName: t.companyName, customerName: t.customerName });
    });
  } finally {
    await client.close();
  }
}
run().catch(console.error);