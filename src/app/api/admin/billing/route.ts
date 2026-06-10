export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { getSessionToken, isInternalRole } from '@/lib/access';
import mongoose from 'mongoose';

type SlipOkPayload = {
  success?: boolean;
  message?: string;
  code?: number;
  data?: {
    amount?: number | string;
    receiver?: {
      displayName?: string;
      name?: string;
      account?: { value?: string };
    };
    transRef?: string;
    transTime?: string;
    transTimestamp?: string;
  };
};

class SlipOkError extends Error {
  status: number;
  code?: number;

  constructor(message: string, status = 400, code?: number) {
    super(message);
    this.name = 'SlipOkError';
    this.status = status;
    this.code = code;
  }
}

const createPaymentBatchId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

const parseDataUrl = (value: string) => {
  const match = value.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!match) return null;

  return {
    mimeType: match[1],
    base64Data: match[2]
  };
};

const getUploadFileName = (mimeType: string) => {
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  return `slip.${ext}`;
};

const readSlipOkJson = async (response: Response): Promise<SlipOkPayload> => {
  try {
    return await response.json();
  } catch {
    return { message: 'SlipOK ไม่ได้ส่งผลลัพธ์กลับมาในรูปแบบที่ระบบอ่านได้' };
  }
};

const getSlipTimestamp = (data: SlipOkPayload['data']) => {
  if (!data) return new Date();
  if (data.transTimestamp) return new Date(data.transTimestamp);
  return new Date();
};

const normalizeEnvValue = (value?: string) =>
  value?.trim().replace(/^['"]|['"]$/g, '');

const verifySlipWithSlipOk = async (
  paymentSlipUrl: string,
  expectedTotalAmount: number,
  slipokKey: string,
  slipokBranch: string
) => {
  const endpoint = `https://api.slipok.com/api/line/apikey/${slipokBranch}`;
  const dataUrl = parseDataUrl(paymentSlipUrl);

  let response: Response;
  if (dataUrl) {
    if (dataUrl.mimeType === 'application/pdf') {
      throw new SlipOkError('SlipOK รองรับเฉพาะรูปภาพสลิป JPG, JPEG, PNG, JFIF หรือ WEBP กรุณาอัปโหลดสลิปเป็นรูปภาพเพื่ออนุมัติอัตโนมัติ', 400);
    }

    if (!dataUrl.mimeType.startsWith('image/')) {
      throw new SlipOkError('ชนิดไฟล์สลิปไม่ถูกต้อง กรุณาอัปโหลดรูปภาพสลิปธนาคาร', 400);
    }

    const buffer = Buffer.from(dataUrl.base64Data, 'base64');
    const formData = new FormData();
    const blob = new Blob([Uint8Array.from(buffer)], { type: dataUrl.mimeType });
    formData.append('files', blob, getUploadFileName(dataUrl.mimeType));
    formData.append('amount', String(expectedTotalAmount));
    formData.append('log', 'true');

    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'x-authorization': slipokKey },
      body: formData
    });
  } else {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-authorization': slipokKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: paymentSlipUrl,
        amount: expectedTotalAmount,
        log: true
      })
    });
  }

  const slipResult = await readSlipOkJson(response);
  if (response.ok && slipResult.success) {
    return slipResult.data || {};
  }

  const message = slipResult.message || 'สลิปไม่ถูกต้อง หรือไม่สามารถตรวจพบรหัส QR บนภาพสลิปได้';
  const isSystemError =
    response.status === 401 ||
    response.status >= 500 ||
    slipResult.code === 1002 ||
    message.toLowerCase().includes('credit') ||
    message.toLowerCase().includes('balance') ||
    message.toLowerCase().includes('limit');

  if (response.status === 401 || slipResult.code === 1002) {
    throw new SlipOkError(
      'การตั้งค่า SlipOK API Key หรือ Branch ID ของระบบไม่ถูกต้อง กรุณาแจ้งผู้ดูแลระบบเพื่อตรวจสอบค่า API จาก SlipOK dashboard',
      502,
      slipResult.code
    );
  }

  throw new SlipOkError(
    isSystemError
      ? `ระบบตรวจสอบสลิปอัตโนมัติยังไม่พร้อมใช้งาน: ${message}`
      : `ตรวจสอบสลิปล้มเหลว: ${message}`,
    isSystemError ? 502 : 400,
    slipResult.code
  );
};

import { LineDriver } from '@/models/LineDriver';
import { SharedTruck } from '@/models/SharedTruck';
import { Customer } from '@/models/Customer';

// GET billing details
export async function GET(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    let query: Record<string, any> = {};
    let paymentType = 'cash';

    if (!isInternalRole(token.role)) {
      // Tenant scoping
      if (token.role === 'corp_admin' || token.role === 'coordinator') {
        if (token.companyName) {
          query = {
            $or: [
              { companyName: token.companyName },
              { customerName: token.companyName }
            ]
          };
        } else {
          return NextResponse.json({ trips: [], paymentType: 'cash' });
        }
      } else {
        if (token.companyId) {
          try {
            query = { companyId: new mongoose.Types.ObjectId(token.companyId) };
          } catch {
            query = { companyName: token.companyName };
          }
        } else if (token.companyName) {
          query = { companyName: token.companyName };
        } else {
          return NextResponse.json({ trips: [], paymentType: 'cash' });
        }
      }

      // Fetch the customer profile to find their paymentType
      const customerQuery = token.companyName 
        ? { companyName: token.companyName } 
        : (token.companyId ? { companyId: new mongoose.Types.ObjectId(token.companyId) } : {});
      const profile = await Customer.findOne(customerQuery).lean();
      if (profile && profile.paymentType) {
        paymentType = profile.paymentType;
      }
    }

    // Fetch trips that have an acceptedFreightPrice (or are cash/credit)
    const trips = await Trip.find({
      ...query,
      $or: [
        { paymentType: { $in: ['cash', 'credit'] } },
        { acceptedFreightPrice: { $exists: true, $ne: null } }
      ]
    })
    .select('tripId customerName companyName origin destination distance weight acceptedFreightPrice paymentType paymentStatus billingDate paymentDueDate paymentSlipUrl paymentBatchId jobSheetReleased opsStatus lineAssignmentStatus driverName licensePlate tailLicensePlate paymentRequestedAt deliveredAt createdAt updatedAt driverId sharedTruckId lineUserId')
    .sort({ createdAt: -1 })
    .lean();

    // Fetch and append bank details for driver payout requests
    const payoutTrips = trips.filter(t => 
      t.opsStatus === 'payment_requested' || t.lineAssignmentStatus === 'payment_requested'
    );

    if (payoutTrips.length > 0) {
      const lineUserIds = payoutTrips.map(t => t.lineUserId).filter(Boolean);
      const driverIds = payoutTrips.map(t => t.driverId).filter(Boolean);
      const sharedTruckIds = payoutTrips.map(t => t.sharedTruckId).filter(Boolean);

      const [lineDrivers, sharedTrucks] = await Promise.all([
        LineDriver.find({
          $or: [
            { lineUserId: { $in: lineUserIds } },
            { _id: { $in: driverIds } }
          ]
        }).select('lineUserId bankName bankAccountNumber bankAccountName').lean(),
        SharedTruck.find({
          _id: { $in: sharedTruckIds }
        }).select('bankName bankAccountNumber bankAccountName').lean()
      ]);

      const lineDriverMap = new Map();
      lineDrivers.forEach((d: any) => {
        if (d.lineUserId) lineDriverMap.set(d.lineUserId, d);
        lineDriverMap.set(d._id.toString(), d);
      });

      const sharedTruckMap = new Map();
      sharedTrucks.forEach((s: any) => {
        sharedTruckMap.set(s._id.toString(), s);
      });

      trips.forEach((t: any) => {
        if (t.opsStatus === 'payment_requested' || t.lineAssignmentStatus === 'payment_requested') {
          let bankInfo = null;
          if (t.lineUserId && lineDriverMap.has(t.lineUserId)) {
            bankInfo = lineDriverMap.get(t.lineUserId);
          } else if (t.driverId && lineDriverMap.has(t.driverId.toString())) {
            bankInfo = lineDriverMap.get(t.driverId.toString());
          }

          if (!bankInfo && t.sharedTruckId && sharedTruckMap.has(t.sharedTruckId.toString())) {
            bankInfo = sharedTruckMap.get(t.sharedTruckId.toString());
          }

          if (bankInfo) {
            t.bankName = bankInfo.bankName || '';
            t.bankAccountNumber = bankInfo.bankAccountNumber || '';
            t.bankAccountName = bankInfo.bankAccountName || '';
          }
        }
      });
    }

    return NextResponse.json({ trips, paymentType });
  } catch (error: any) {
    console.error('GET billing error:', error);
    return NextResponse.json({ error: 'ดึงข้อมูลการเงินไม่สำเร็จ' }, { status: 500 });
  }
}

// POST - Submit payment slip for a batch of cash trips
export async function POST(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripIds, paymentSlipUrl } = await req.json();

    if (!tripIds || !Array.isArray(tripIds) || tripIds.length === 0) {
      return NextResponse.json({ error: 'กรุณาระบุงานที่ต้องการชำระเงิน' }, { status: 400 });
    }

    if (!paymentSlipUrl) {
      return NextResponse.json({ error: 'กรุณาอัปโหลดหรือระบุลิงก์สลิปการโอนเงิน' }, { status: 400 });
    }

    await connectToDatabase();

    // Verify ownership of the trips if not system_owner
    if (!isInternalRole(token.role)) {
      const dbTrips = await Trip.find({ _id: { $in: tripIds } }).select('companyId companyName customerName').lean();
      const isOwner = dbTrips.every(t => {
        if (token.role === 'corp_admin' || token.role === 'coordinator') {
          return token.companyName && (t.customerName === token.companyName || t.companyName === token.companyName);
        }
        const tCompId = t.companyId?.toString();
        return (token.companyId && tCompId === token.companyId) || (token.companyName && t.companyName === token.companyName);
      });

      if (!isOwner) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์ทำรายการในบางงานที่เลือก' }, { status: 403 });
      }
    }

    // Get expected total billing amount for selected unpaid cash trips
    const targetTrips = await Trip.find({ _id: { $in: tripIds }, paymentType: 'cash', paymentStatus: 'unpaid' });
    if (targetTrips.length === 0) {
      return NextResponse.json({ error: 'ไม่พบรายการค้างชำระเงินสดที่ระบุ' }, { status: 404 });
    }
    const expectedTotalAmount = targetTrips.reduce((sum, t) => sum + (t.acceptedFreightPrice || 0), 0);

    const slipokKey = normalizeEnvValue(process.env.SLIPOK_API_KEY);
    const slipokBranch = normalizeEnvValue(process.env.SLIPOK_BRANCH_ID);

    if (!slipokKey || !slipokBranch) {
      return NextResponse.json({
        error: 'ระบบยังไม่ได้ตั้งค่า SlipOK API สำหรับการอนุมัติอัตโนมัติ กรุณาแจ้งผู้ดูแลระบบ'
      }, { status: 503 });
    }

    try {
      const slipData = await verifySlipWithSlipOk(paymentSlipUrl, expectedTotalAmount, slipokKey, slipokBranch);
      const slipAmount = Number(slipData.amount);
      const transRef = slipData.transRef;

      if (!Number.isFinite(slipAmount)) {
        return NextResponse.json({
          error: `SlipOK ตรวจผ่านแต่ไม่พบยอดเงินในสลิป กรุณาอัปโหลดรูปสลิปใหม่อีกครั้ง`
        }, { status: 400 });
      }

      if (transRef) {
        const duplicateTrip = await Trip.findOne({ paymentTransRef: transRef }).select('tripId').lean();
        if (duplicateTrip) {
          return NextResponse.json({
            error: `สลิปนี้เคยถูกใช้ชำระเงินในระบบแล้ว (เลขอ้างอิงสลิป: ${transRef}) เพื่อความปลอดภัยกรุณาใช้สลิปโอนเงินชุดใหม่`
          }, { status: 400 });
        }
      }

      const paymentBatchId = createPaymentBatchId('BATCH-AUTO');
      const result = await Trip.updateMany(
        { _id: { $in: tripIds }, paymentType: 'cash', paymentStatus: 'unpaid' },
        {
          $set: {
            paymentStatus: 'paid',
            paymentSlipUrl,
            paymentBatchId,
            jobSheetReleased: true,
            paymentTransRef: transRef || `AUTO-VERIFIED-${Date.now()}`,
            paymentTransTime: getSlipTimestamp(slipData)
          }
        }
      );

      return NextResponse.json({
        message: `ตรวจสอบสลิปกับ SlipOK สำเร็จ ยอดสลิป ฿${slipAmount.toLocaleString()} ผ่านเงื่อนไขยอดใบงาน ฿${expectedTotalAmount.toLocaleString()} อนุมัติและปลดปล่อยใบงานแล้ว`,
        paymentBatchId,
        modifiedCount: result.modifiedCount,
        verifiedAutomatically: true
      });
    } catch (slipError: any) {
      if (slipError instanceof SlipOkError) {
        console.warn('SlipOK verification rejected payment slip:', {
          code: slipError.code,
          message: slipError.message
        });
        return NextResponse.json({ error: slipError.message }, { status: slipError.status });
      }

      console.error('SlipOK verification request failed:', slipError);
      return NextResponse.json({
        error: 'ระบบเชื่อมต่อ SlipOK ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง โดยรายการยังไม่ถูกส่งเข้าคิวรอตรวจสอบ'
      }, { status: 502 });
    }

  } catch (error: any) {
    console.error('POST billing error:', error);
    return NextResponse.json({ error: 'ส่งข้อมูลการชำระเงินไม่สำเร็จ' }, { status: 500 });
  }
}

// PUT - Verification or credit terms update (System Owner/Owner only)
export async function PUT(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isInternalRole(token.role)) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์ทำรายการนี้' }, { status: 403 });
    }

    const { action, paymentBatchId, tripIds, tripId, billingDate, paymentDueDate } = await req.json();
    await connectToDatabase();

    if (action === 'approve_batch') {
      if (!paymentBatchId) {
        return NextResponse.json({ error: 'กรุณาระบุรหัสชุดการชำระเงิน (Batch ID)' }, { status: 400 });
      }

      // Verify the batch: set paid and release job sheets
      const result = await Trip.updateMany(
        { paymentBatchId, paymentStatus: 'pending_verification' },
        {
          $set: {
            paymentStatus: 'paid',
            jobSheetReleased: true
          }
        }
      );

      return NextResponse.json({
        message: `อนุมัติการชำระเงินชุด ${paymentBatchId} สำเร็จ และปล่อยใบงานแล้ว`,
        modifiedCount: result.modifiedCount
      });
    } 
    
    if (action === 'decline_batch') {
      if (!paymentBatchId) {
        return NextResponse.json({ error: 'กรุณาระบุรหัสชุดการชำระเงิน (Batch ID)' }, { status: 400 });
      }

      // Decline batch: return to unpaid
      const result = await Trip.updateMany(
        { paymentBatchId, paymentStatus: 'pending_verification' },
        {
          $set: {
            paymentStatus: 'unpaid',
            paymentSlipUrl: null,
            paymentBatchId: null
          }
        }
      );

      return NextResponse.json({
        message: `ปฏิเสธการชำระเงินชุด ${paymentBatchId} สำเร็จ สถานะถูกรีเซ็ตเป็นค้างชำระ`,
        modifiedCount: result.modifiedCount
      });
    }

    if (action === 'update_credit_dates') {
      if (!tripIds || !Array.isArray(tripIds) || tripIds.length === 0) {
        return NextResponse.json({ error: 'กรุณาระบุงานเครดิตที่ต้องการตั้งค่ารอบบิล' }, { status: 400 });
      }

      const updates: Record<string, any> = {};
      if (billingDate) updates.billingDate = new Date(billingDate);
      if (paymentDueDate) updates.paymentDueDate = new Date(paymentDueDate);

      // If dates are provided, we also check if they are paid or stay unpaid
      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'ไม่มีข้อมูลวันที่ให้อัปเดต' }, { status: 400 });
      }

      const result = await Trip.updateMany(
        { _id: { $in: tripIds }, paymentType: 'credit' },
        { $set: updates }
      );

      return NextResponse.json({
        message: 'อัปเดตวันวางบิลและวันกำหนดชำระเงินของงานเครดิตสำเร็จ',
        modifiedCount: result.modifiedCount
      });
    }

    if (action === 'mark_credit_paid') {
      if (!tripIds || !Array.isArray(tripIds) || tripIds.length === 0) {
        return NextResponse.json({ error: 'กรุณาระบุงานเครดิตที่ต้องการทำรายการ' }, { status: 400 });
      }

      const result = await Trip.updateMany(
        { _id: { $in: tripIds }, paymentType: 'credit' },
        { $set: { paymentStatus: 'paid' } }
      );

      return NextResponse.json({
        message: 'บันทึกสถานะชำระเงินของงานเครดิตสำเร็จ',
        modifiedCount: result.modifiedCount
      });
    }

    if (action === 'mark_driver_payout_paid') {
      if (!tripId) {
        return NextResponse.json({ error: 'กรุณาระบุงานรถร่วมที่ต้องการปิดยอดโอนเงิน' }, { status: 400 });
      }
      if (!mongoose.Types.ObjectId.isValid(tripId)) {
        return NextResponse.json({ error: 'รหัสงานรถร่วมไม่ถูกต้อง' }, { status: 400 });
      }

      const result = await Trip.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(tripId),
          $or: [
            { opsStatus: 'payment_requested' },
            { lineAssignmentStatus: 'payment_requested' }
          ]
        },
        {
          $set: {
            opsStatus: 'paid',
            lineAssignmentStatus: 'paid',
            status: 'Verified'
          }
        },
        { new: true }
      );

      if (!result) {
        return NextResponse.json({ error: 'ไม่พบงานที่อยู่ในสถานะรอโอนเงินรถร่วม' }, { status: 404 });
      }

      return NextResponse.json({
        message: `บันทึกจ่ายเงินรถร่วมสำหรับงาน ${result.tripId} เรียบร้อยแล้ว`,
        trip: result
      });
    }

    return NextResponse.json({ error: 'การกระทำ (Action) ไม่ถูกต้อง' }, { status: 400 });

  } catch (error: any) {
    console.error('PUT billing error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดขณะบันทึกข้อมูล' }, { status: 500 });
  }
}
