
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Simple Schema for auditing
const TripSchema = new mongoose.Schema({
  tripId: String,
  lineUserId: String,
  lineAssignmentStatus: String,
  status: String,
  licensePlate: String,
  driverName: String
}, { strict: false });

const Trip = mongoose.models.Trip || mongoose.model('Trip', TripSchema);

async function audit() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('--- AUDIT START ---');
    
    const allTrips = await Trip.find({ 
      status: { $in: ['Pending', 'No POD'] }
    }).select('tripId lineUserId lineAssignmentStatus status licensePlate driverName');
    
    console.log(`Found ${allTrips.length} potential trips.`);
    allTrips.forEach(t => {
      console.log(`[${t.tripId}] Status: ${t.status} | User: ${t.lineUserId} | AssignStatus: ${t.lineAssignmentStatus} | Plate: ${t.licensePlate}`);
    });
    
    console.log('--- AUDIT END ---');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

audit();
