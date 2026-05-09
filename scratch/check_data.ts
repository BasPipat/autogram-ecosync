import { connectToDatabase } from './src/lib/mongodb';
import { User } from './src/models/User';
import { Trip } from './src/models/Trip';
import { MonthlyCarbonLedger } from './src/models/MonthlyCarbonLedger';
import mongoose from 'mongoose';

async function checkData() {
  await connectToDatabase();
  const email = 'pipat_leader@hotmail.com';
  const user = await User.findOne({ email });
  console.log('--- USER INFO ---');
  if (user) {
    console.log('ID:', user._id);
    console.log('Role:', user.role);
    console.log('CompanyId:', user.companyId);
    console.log('CompanyName:', user.companyName);
  } else {
    console.log('User not found');
  }

  const tripCount = await Trip.countDocuments({});
  console.log('--- TRIP STATS ---');
  console.log('Total Trips:', tripCount);

  if (user && user.companyId) {
    const companyTripCount = await Trip.countDocuments({ companyId: user.companyId });
    console.log('Trips for CompanyId:', companyTripCount);
  }
  
  if (user && user.companyName) {
    const nameTripCount = await Trip.countDocuments({ companyName: user.companyName });
    console.log('Trips for CompanyName:', nameTripCount);
  }

  const tripsWithNoCompanyId = await Trip.countDocuments({ companyId: { $exists: false } });
  console.log('Trips with NO CompanyId:', tripsWithNoCompanyId);

  const ledgers = await MonthlyCarbonLedger.find({}).limit(5);
  console.log('--- LEDGER SAMPLES ---');
  console.log(JSON.stringify(ledgers, null, 2));

  process.exit(0);
}

checkData().catch(err => {
  console.error(err);
  process.exit(1);
});
