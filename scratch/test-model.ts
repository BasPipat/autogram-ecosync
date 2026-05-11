import { Trip } from './src/models/Trip';
import { connectToDatabase } from './src/lib/mongodb';

async function test() {
  await connectToDatabase();
  const trips = await Trip.find().limit(5);
  console.log('Trips found:', trips.length);
  if (trips.length > 0) {
    console.log('Sample Trip GPS Session:', JSON.stringify(trips[0].gpsSession, null, 2));
  }
  process.exit(0);
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
