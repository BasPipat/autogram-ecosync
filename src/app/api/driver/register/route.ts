import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { LineDriver } from '@/models/LineDriver';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { 
      displayName, phone, vehicleType, fuelType, engineSize, 
      licensePlate, idCardUrl, licenseUrl, gpsStatus 
    } = data;

    // In a real LIFF scenario, we would get lineUserId from the headers or token
    // For now, we'll try to find by phone or create a new one if testing via browser
    // Ideally, the URL would contain ?lineUserId=xxx
    const { searchParams } = new URL(req.url);
    const lineUserId = searchParams.get('lineUserId');

    await connectToDatabase();

    const updateData: any = {
      displayName,
      phone,
      vehicleType,
      engineSize,
      fuelType,
      licensePlate,
      status: 'under_review', // Set to under review after submission
      gpsConsentStatus: gpsStatus === 'granted' ? 'granted' : 'pending',
      gpsConsentAt: gpsStatus === 'granted' ? new Date() : undefined,
    };

    // Mapping documents - based on LineDriver model
    // Note: LineDriver has pendingDocumentType, but for bulk registration,
    // we'll store them in a way that the admin can see.
    // I'll add them to tempAnalysisResult or a new field if needed.
    // For now, let's just store the core info.

    if (!lineUserId || lineUserId.startsWith('web-')) {
      return NextResponse.json({ 
        error: 'กรุณาเข้าใช้งานผ่าน LINE OA เท่านั้น (ไม่พบ LINE User ID ที่ถูกต้อง)' 
      }, { status: 400 });
    }

    await LineDriver.findOneAndUpdate(
      { lineUserId },
      { $set: updateData },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: 'Registration submitted successfully' });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to submit registration' }, { status: 500 });
  }
}
