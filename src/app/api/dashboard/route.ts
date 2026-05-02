import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip, CarbonLedger, IntegrityVault } from '@/models/EcoSync';

export async function GET() {
  try {
    await connectToDatabase();

    // 1. ดึงสถิติภาพรวม (Stats)
    const totalTrips = await Trip.countDocuments();
    
    // รวมยอดคาร์บอนทั้งหมด
    const carbonData = await CarbonLedger.aggregate([{ $group: { _id: null, total: { $sum: "$emissionsKgCO2" } } }]);
    const totalCarbon = carbonData.length > 0 ? carbonData[0].total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";

    // นับจำนวน POD ที่ตรวจสอบแล้ว
    const verifiedPODs = await IntegrityVault.countDocuments({ isVerified: true });

    // 2. ดึงข้อมูล 5 เที่ยวล่าสุด (Recent Trips)
    const recentTrips = await Trip.find().sort({ createdAt: -1 }).limit(5).lean();
    
    // จับคู่ข้อมูล Trip + Carbon + POD ให้เข้ากัน
    const tripsWithDetails = await Promise.all(recentTrips.map(async (trip) => {
      const carbon = await CarbonLedger.findOne({ tripId: trip.tripId }).lean();
      const vault = await IntegrityVault.findOne({ tripId: trip.tripId }).lean();
      
      return {
        id: trip.tripId,
        origin: trip.origin,
        dest: trip.destination,
        carbon: carbon ? carbon.emissionsKgCO2.toFixed(2) : 'N/A',
        status: vault ? (vault.isVerified ? 'Verified' : 'Pending') : 'No POD'
      };
    }));

    return NextResponse.json({
      stats: { totalTrips, totalCarbon, verifiedPODs },
      recentTrips: tripsWithDetails
    }, { status: 200 });

  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'ดึงข้อมูลล้มเหลว' }, { status: 500 });
  }
}