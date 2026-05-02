import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip, CarbonLedger } from '@/models/EcoSync';

// ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจก (Emission Factor) อ้างอิง TGO เบื้องต้นสำหรับรถบรรทุก
// (kgCO2e / ton-km) - บอสสามารถปรับแก้ค่านี้ให้ตรงกับประเภทรถ Volvo FM ของบอสได้ภายหลังครับ
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
    const newTrip = await Trip.create({
      tripId,
      origin,
      destination,
      distanceKm,
      cargoWeightTons,
      driverId,
      status: 'completed'
    });

    // 3. Logic คำนวณคาร์บอน (ตามหลักการ: น้ำหนัก x ระยะทาง x Emission Factor)
    const emissionsKgCO2 = (cargoWeightTons * distanceKm * EMISSION_FACTOR).toFixed(2);

    // 4. บันทึกลง Carbon Activity Ledger
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
    // ป้องกัน Error กรณีส่ง tripId ซ้ำ
    if (error.code === 11000) {
      return NextResponse.json({ error: 'รหัสงานขนส่ง (Trip ID) นี้ถูกบันทึกไปแล้ว' }, { status: 400 });
    }
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}