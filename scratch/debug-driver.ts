import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(__dirname, '../.env.local') });

import { connectToDatabase } from '../src/lib/mongodb';
import { LineDriver } from '../src/models/LineDriver';
import { Trip } from '../src/models/Trip';

async function debugDriver() {
  await connectToDatabase();
  console.log('--- Debugging Driver & Trip Status ---');
  
  // ค้นหาคนขับที่มีชื่อคล้ายกับในรูป
  const drivers = await LineDriver.find({ displayName: /พิพัฒน์/ }).lean();
  console.log(`พบคนขับ ${drivers.length} ราย`);

  for (const driver of drivers) {
    console.log(`\nDriver: ${driver.displayName} (${driver.lineUserId})`);
    console.log(`Status: ${driver.status}`);
    console.log(`Active Trip ID: ${driver.activeTripId || 'None'}`);

    const trips = await Trip.find({ 
      $or: [
        { _id: driver.activeTripId },
        { lineUserId: driver.lineUserId }
      ]
    }).sort({ createdAt: -1 }).limit(3).lean();

    console.log(`ประวัติงานล่าสุด (${trips.length} งาน):`);
    trips.forEach(t => {
      console.log(`- [${t.tripId}] Status: ${t.lineAssignmentStatus} | opsStatus: ${t.opsStatus}`);
    });
  }
  
  process.exit(0);
}

debugDriver();
