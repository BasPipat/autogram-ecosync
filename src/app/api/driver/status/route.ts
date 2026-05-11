import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { LineDriver } from '@/models/LineDriver';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const lineUserId = searchParams.get('lineUserId');

    if (!lineUserId) {
      return NextResponse.json({ error: 'Missing lineUserId' }, { status: 400 });
    }

    const driver = await LineDriver.findOne({ lineUserId });
    
    if (!driver) {
      return NextResponse.json({ 
        isRegistered: false,
        status: null
      });
    }

    return NextResponse.json({ 
      isRegistered: true,
      status: driver.status, // 'pending', 'approved', 'rejected'
      displayName: driver.displayName
    });

  } catch (error: any) {
    console.error('Driver Status API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
