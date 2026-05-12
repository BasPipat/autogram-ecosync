
const mongoose = require('mongoose');
const fs = require('fs');

// Read env manually to avoid dependency issues
const envFile = fs.readFileSync('.env.local', 'utf8');
const mongoUri = envFile.match(/MONGODB_URI=(.*)/)[1].trim().replace(/["']/g, '');

const TripSchema = new mongoose.Schema({}, { strict: false });
const Trip = mongoose.models.Trip || mongoose.model('Trip', TripSchema);

async function deepAudit() {
  try {
    await mongoose.connect(mongoUri);
    const ids = ['AUT10052026002', 'AUT10052026001', 'INN09052026001', 'INN09052026002'];
    const trips = await Trip.find({ tripId: { $in: ids } });
    
    console.log('--- DEEP AUDIT ---');
    trips.forEach(t => {
      console.log(`TripID: ${t.tripId}`);
      console.log(` - LicensePlate: "${t.licensePlate}" (Type: ${typeof t.licensePlate})`);
      console.log(` - DriverName: "${t.driverName}"`);
      console.log(` - lineUserId: "${t.lineUserId}"`);
      console.log(` - lineAssignmentStatus: "${t.lineAssignmentStatus}"`);
      console.log(` - status: "${t.status}"`);
      console.log(` - companyName: "${t.companyName}"`);
      console.log('------------------');
    });
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

deepAudit();
