export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { CarbonLedger } from '@/models/CarbonLedger';

// ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจก (Emission Factor) อ้างอิง TGO เบื้องต้นสำหรับรถบรรทุก
const EMISSION_FACTOR = 0.154; 

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tripId, origin, destination, distanceKm, cargoWeightTons, driverId } = body;

    // 1. ตรวจสอบข้อมูลว่าส่งมาครบไหม
    if (!tripId || !origin || !destination || !distanceKm || !cargoWeightTons || !driverId) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    await connectToDatabase();

    // 2. บันทึกข้อมูลงานขนส่ง (Trip)
    // หมายเหตุ: ปรับฟิลด์ให้ตรงกับ src/models/Trip.ts (distance, weight, status)
    const newTrip = await Trip.create({
      tripId,
      origin,
      destination,
      distance: distanceKm,
      weight: cargoWeightTons,
      driverId, // Note: ใน Trip.ts driverId เป็น ObjectId แต่อนุญาตให้ผ่านเป็น String ได้ถ้าไม่ได้ validate strict หรือจะใช้ driverName แทน
      status: 'No POD' // ปรับให้ตรงกับ enum ใน Trip.ts
    });

    // 3. Logic คำนวณคาร์บอน
    const emissionsKgCO2 = (cargoWeightTons * distanceKm * EMISSION_FACTOR).toFixed(2);

    // 4. บันทึกลง Carbon Ledger (ใช้โมเดลใหม่ที่แยกออกมา)
    const newLedger = await CarbonLedger.create({
      tripId,
      emissionsKgCO2: parseFloat(emissionsKgCO2),
      calculationMethod: 'TGO Standard (Weight x Distance x EF)'
    });

    return NextResponse.json({
      message: 'บันทึกงานและคำนวณคาร์บอนสำเร็จ',
      trip: newTrip,
      carbonLedger: newLedger
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error in complete trip API:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'รหัสงานขนส่ง (Trip ID) นี้ถูกบันทึกไปแล้ว' }, { status: 400 });
    }
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}
