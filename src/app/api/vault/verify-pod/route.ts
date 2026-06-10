export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { IntegrityVault } from '@/models/IntegrityVault';
import { Trip } from '@/models/Trip';
import { getSessionToken } from '@/lib/access';
import { getLineClient } from '@/lib/line';

export async function POST(request: NextRequest) {
  try {
    // Add Authentication Check
    const token = await getSessionToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId } = await request.json();

    if (!tripId) {
      return NextResponse.json({ error: 'ไม่มีรหัสงาน' }, { status: 400 });
    }

    await connectToDatabase();

    // ค้นหางานแล้วเปลี่ยนสถานะเป็น isVerified: true
    let updatedVault = await IntegrityVault.findOneAndUpdate(
      { tripId },
      { 
        isVerified: true,
        verifiedAt: new Date()
      },
      { new: true }
    );

    // อัปเดตสถานะของ Trip ด้วย
    const trip = await Trip.findOneAndUpdate(
      { tripId },
      {
        status: 'Verified',
        opsStatus: 'payment_requested',
        lineAssignmentStatus: 'payment_requested',
        paymentRequestedAt: new Date(),
      },
      { new: true }
    );

    // แจ้งเตือนให้จ่ายเงินผ่าน LINE
    if (trip) {
      const PAYMENT_NOTIFY_LINE_USER_ID = process.env.LINE_PAYMENT_NOTIFY_USER_ID || process.env.LINE_ADMIN_USER_ID || '';
      if (PAYMENT_NOTIFY_LINE_USER_ID) {
        try {
          const formattedPrice = new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            maximumFractionDigits: 0
          }).format(trip.acceptedFreightPrice || 0);

          await getLineClient().pushMessage(PAYMENT_NOTIFY_LINE_USER_ID, {
            type: 'text',
            text: [
              'แจ้งเตือนจ่ายเงินรถร่วม (เอกสารผ่านการตรวจสอบแล้ว)',
              `รหัสงาน: ${trip.tripId}`,
              `คนขับ: ${trip.driverName || '-'}`,
              `ทะเบียน: ${trip.licensePlate || '-'} / ${trip.tailLicensePlate || '-'}`,
              `จำนวนเงิน: ${formattedPrice}`,
            ].join('\n'),
          });
        } catch (lineError) {
          console.error('Failed to send LINE payment notification:', lineError);
        }
      }
    }

    if (!updatedVault) {
      const trip = await Trip.findOne({ tripId });
      if (trip) {
        updatedVault = await IntegrityVault.create({
          tripId,
          podImageUrl: trip.podImageUrl || '',
          isVerified: true,
          verifiedAt: new Date()
        });
      }
    }

    if (!updatedVault) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลหลักฐานและงานขนส่งนี้' }, { status: 404 });
    }

    return NextResponse.json({ message: 'อนุมัติหลักฐานสำเร็จ', data: updatedVault }, { status: 200 });

  } catch (error: unknown) {
    console.error('Verify API Error:', error);
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดภายในระบบ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
