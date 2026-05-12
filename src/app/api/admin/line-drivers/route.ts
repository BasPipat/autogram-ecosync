export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getSessionToken, isInternalRole } from '@/lib/access';
import { LineDriver, ILineDriver, LineDriverStatus } from '@/models/LineDriver';
import { DriverDocument, IDriverDocument } from '@/models/DriverDocument';
import { SharedTruck } from '@/models/SharedTruck';
import { Setting } from '@/models/Setting';

type UpdateLineDriverBody = {
  lineUserId?: unknown;
  status?: unknown;
  reviewNote?: unknown;
  sharedTruckId?: unknown;
  createPlaceholderTruck?: boolean;
};

const allowedStatuses: LineDriverStatus[] = ['new', 'awaiting_documents', 'under_review', 'approved', 'rejected', 'suspended'];

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

async function requireInternal(req: NextRequest) {
  const token = await getSessionToken(req);
  if (!token) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const allowedRoles = ['system_owner', 'owner', 'admin', 'operator'];
  if (!token.role || !allowedRoles.includes(token.role)) {
    return { response: NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 }) };
  }

  return { token };
}

function serializeDocument(document: IDriverDocument) {
  return {
    _id: document._id.toString(),
    lineUserId: document.lineUserId,
    documentType: document.documentType,
    mediaType: document.mediaType,
    lineMessageId: document.lineMessageId || '',
    textValue: document.textValue || '',
    fileName: document.fileName || '',
    mimeType: document.mimeType || '',
    status: document.status,
    reviewNote: document.reviewNote || '',
    tripId: document.tripId?.toString(),
    jobOfferId: document.jobOfferId?.toString(),
    createdAt: document.createdAt?.toISOString(),
    updatedAt: document.updatedAt?.toISOString(),
  };
}

function serializeDriver(driver: ILineDriver, documents: IDriverDocument[]) {
  return {
    _id: driver._id.toString(),
    lineUserId: driver.lineUserId,
    displayName: driver.displayName || '',
    pictureUrl: driver.pictureUrl || '',
    status: driver.status,
    pendingDocumentType: driver.pendingDocumentType || '',
    phone: driver.phone || '',
    bankName: driver.bankName || '',
    bankAccountNumber: driver.bankAccountNumber || '',
    bankAccountName: driver.bankAccountName || '',
    sharedTruckId: driver.sharedTruckId?.toString(),
    activeTripId: driver.activeTripId?.toString(),
    activeJobOfferId: driver.activeJobOfferId?.toString(),
    gpsConsentStatus: driver.gpsConsentStatus,
    gpsConsentAt: driver.gpsConsentAt?.toISOString(),
    lastLocation: driver.lastLocation || null,
    reviewNote: driver.reviewNote || '',
    approvedAt: driver.approvedAt?.toISOString(),
    rejectedAt: driver.rejectedAt?.toISOString(),
    createdAt: driver.createdAt?.toISOString(),
    updatedAt: driver.updatedAt?.toISOString(),
    documents: documents.map(serializeDocument),
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireInternal(req);
    if ('response' in auth) return auth.response;

    await connectToDatabase();
    const drivers = await LineDriver.find({}).sort({ updatedAt: -1 });
    const lineUserIds = drivers.map(driver => driver.lineUserId);
    const documents = await DriverDocument.find({ lineUserId: { $in: lineUserIds } }).sort({ createdAt: -1 });
    const documentsByLineUserId = new Map<string, IDriverDocument[]>();

    for (const document of documents) {
      const items = documentsByLineUserId.get(document.lineUserId) || [];
      items.push(document);
      documentsByLineUserId.set(document.lineUserId, items);
    }

    return NextResponse.json(drivers.map(driver => serializeDriver(driver, documentsByLineUserId.get(driver.lineUserId) || [])));
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลคนขับ LINE ได้' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireInternal(req);
    if ('response' in auth) return auth.response;

    const body = await req.json() as UpdateLineDriverBody;
    const lineUserId = text(body.lineUserId);
    const nextStatus = text(body.status) as LineDriverStatus;
    const sharedTruckId = text(body.sharedTruckId);

    if (!lineUserId || !allowedStatuses.includes(nextStatus)) {
      return NextResponse.json({ error: 'ข้อมูลสถานะคนขับไม่ถูกต้อง' }, { status: 400 });
    }

    await connectToDatabase();
    
    // 1. Prepare Update Data
    const updateData: Partial<ILineDriver> = {
      status: nextStatus,
      reviewNote: text(body.reviewNote),
    };

    if (nextStatus === 'approved') {
      updateData.approvedAt = new Date();
      updateData.rejectedAt = undefined;
      updateData.pendingDocumentType = undefined;
    } else if (nextStatus === 'rejected') {
      updateData.rejectedAt = new Date();
    }

    let finalSharedTruckId = sharedTruckId;

    // 2. Handle Placeholder Truck
    if (body.createPlaceholderTruck && nextStatus === 'approved' && !finalSharedTruckId) {
      const existingDriver = await LineDriver.findOne({ lineUserId });
      if (existingDriver && !existingDriver.sharedTruckId) {
        const placeholderTruck = await SharedTruck.create({
          lineUserId,
          onboardingStatus: 'approved',
          gpsConsentStatus: existingDriver.gpsConsentStatus || 'granted',
          gpsConsentAt: existingDriver.gpsConsentAt || new Date(),
          headPlateNumber: `[รอระบุ]-${lineUserId.slice(-4)}`,
          tailPlateNumber: '[รอระบุ]',
          compulsoryInsuranceExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          vehicleInsuranceType: 'ไม่มีประกัน',
          cargoInsuranceAmount: 0,
          driverFirstName: existingDriver.displayName || 'คนขับ',
          driverLastName: '[รอระบุ]',
          driverLicenseType: 'บ.2',
          driverPhone: existingDriver.phone || '[รอระบุ]',
          bankName: existingDriver.bankName || '[รอระบุ]',
          bankAccountNumber: existingDriver.bankAccountNumber || '[รอระบุ]',
          bankAccountName: existingDriver.bankAccountName || existingDriver.displayName,
        });
        finalSharedTruckId = placeholderTruck._id.toString();
      }
    }

    if (finalSharedTruckId) {
      updateData.sharedTruckId = new mongoose.Types.ObjectId(finalSharedTruckId);
    }

    // 3. Update Database (Driver)
    const driver = await LineDriver.findOneAndUpdate({ lineUserId }, updateData, { new: true });
    if (!driver) {
      return NextResponse.json({ error: 'ไม่พบคนขับ LINE' }, { status: 404 });
    }

    // 4. Update Database (SharedTruck)
    if (finalSharedTruckId) {
      await SharedTruck.findByIdAndUpdate(finalSharedTruckId, {
        lineUserId,
        onboardingStatus: nextStatus === 'approved' ? 'approved' : 'under_review',
        gpsConsentStatus: driver.gpsConsentStatus,
        gpsConsentAt: driver.gpsConsentAt,
        documentReviewNote: driver.reviewNote,
      });
    }

    // 5. LINE API Section (Nested try/catch, NO early return, Detailed Reporting)
    let lineStatus = "ไม่ได้เชื่อมต่อ LINE";

    if (nextStatus === 'approved' || nextStatus === 'suspended' || nextStatus === 'rejected') {
      try {
        if (!lineUserId.startsWith('web-')) {
          const { getLineClient } = await import('@/lib/line');
          const lineClient = getLineClient();
          const config = await Setting.findOne({ key: 'line_config', scope: 'global' });

          if (nextStatus === 'approved') {
            lineStatus = "";
            // Action A: Link Rich Menu
            if (config?.lineRichMenuIdDriver) {
              try {
                await lineClient.linkRichMenuToUser(lineUserId, config.lineRichMenuIdDriver);
                lineStatus = "✅ สลับ Rich Menu สำเร็จ";
              } catch (e: any) {
                console.error('Rich Menu Switch Fail:', e);
                lineStatus = "❌ สลับเมนูไม่สำเร็จ (ID อาจจะผิด)";
              }
            } else {
              lineStatus = "⚠️ ข้ามการสลับเมนู (ไม่พบ ID ในระบบ)";
            }

            // Action B: Push Message (Always try even if menu fails)
            try {
              await lineClient.pushMessage(lineUserId, {
                type: 'text',
                text: '✅ ยินดีด้วยครับ! บัญชีรถร่วมของคุณได้รับการอนุมัติเรียบร้อยแล้ว ตอนนี้คุณสามารถเริ่มรับงานผ่านทาง LINE OA ได้ทันทีครับ\n\nพิมพ์ "ดูงาน" เพื่อตรวจสอบงานที่เปิดรับอยู่ครับ',
              });
              lineStatus += (lineStatus ? " + " : "") + "📨 ส่งข้อความแจ้งเตือนสำเร็จ";
            } catch (e: any) {
              console.error('Push Message Fail:', e);
              lineStatus += (lineStatus ? " + " : "") + "❌ ส่งข้อความไม่สำเร็จ";
            }
          } else if (nextStatus === 'suspended' || nextStatus === 'rejected') {
            // Action C: Unlink and Notify for rejection
            const statusText = nextStatus === 'suspended' ? 'ถูกระงับการใช้งานชั่วคราว' : 'ไม่ผ่านการอนุมัติ';
            
            try {
              await lineClient.unlinkRichMenuFromUser(lineUserId);
              lineStatus = "✅ ถอน Rich Menu ออกแล้ว";
            } catch {
              lineStatus = "⚠️ ถอนเมนูไม่สำเร็จ (อาจไม่มีเมนูอยู่แล้ว)";
            }

            try {
              await lineClient.pushMessage(lineUserId, {
                type: 'text',
                text: `❌ ขออภัยครับ บัญชีของคุณ${statusText} กรุณาติดต่อเจ้าหน้าที่เพื่อสอบถามรายละเอียดเพิ่มเติมครับ`,
              });
              lineStatus += " + 📨 แจ้งเตือนคนขับแล้ว";
            } catch {
              lineStatus += " + ❌ ส่งข้อความไม่สำเร็จ";
            }
          }
        } else {
          lineStatus = "⏩ ข้าม (ID ของระบบไม่ใช่ LINE ID)";
        }
      } catch (lineError) {
        console.warn('LINE API Failed, but DB update will proceed:', lineError);
      }
    }

    // 6. Final Response
    return NextResponse.json({ 
      message: 'อัปเดตสถานะสำเร็จ', 
      lineStatus,
      driver: serializeDriver(driver, []) 
    });
  } catch (error) {
    console.error('Update driver error:', error);
    return NextResponse.json({ error: 'อัปเดตสถานะคนขับไม่สำเร็จ' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireInternal(req);
    if ('response' in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const lineUserId = searchParams.get('lineUserId');

    if (!lineUserId) {
      return NextResponse.json({ error: 'ไม่พบ LINE User ID' }, { status: 400 });
    }

    await connectToDatabase();

    try {
      if (lineUserId.startsWith('U')) {
        const { getLineClient } = await import('@/lib/line');
        await getLineClient().unlinkRichMenuFromUser(lineUserId);
      }
    } catch (lineError) {
      console.warn('LINE Unlink failed or skipped:', lineError);
    }

    const driver = await LineDriver.findOne({ lineUserId });
    await DriverDocument.deleteMany({ lineUserId });
    
    if (driver?.sharedTruckId) {
      await SharedTruck.deleteOne({ _id: driver.sharedTruckId, lineUserId });
    }

    await LineDriver.deleteOne({ lineUserId });

    return NextResponse.json({ message: 'ลบข้อมูลสำเร็จ' });
  } catch (error) {
    console.error('Delete driver error:', error);
    return NextResponse.json({ error: 'ลบข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}
