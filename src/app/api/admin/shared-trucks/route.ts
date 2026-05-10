export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getSessionToken } from '@/lib/access';
import { SharedTruck, ISharedTruck } from '@/models/SharedTruck';


type SharedTruckBody = {
  sharedTruckId?: unknown;
  headPlateNumber?: unknown;
  tailPlateNumber?: unknown;
  compulsoryInsuranceExpiresAt?: unknown;
  vehicleInsuranceType?: unknown;
  cargoInsuranceAmount?: unknown;
  driverFirstName?: unknown;
  driverLastName?: unknown;
  driverLicenseType?: unknown;
  driverPhone?: unknown;
  bankName?: unknown;
  bankAccountNumber?: unknown;
  bankAccountName?: unknown;
};

type SharedTruckPayload = {
  headPlateNumber: string;
  tailPlateNumber: string;
  compulsoryInsuranceExpiresAt: Date;
  vehicleInsuranceType: string;
  cargoInsuranceAmount: number;
  driverFirstName: string;
  driverLastName: string;
  driverLicenseType: string;
  driverPhone: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

const isOwner = (role?: string) => role === 'system_owner' || role === 'owner';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseDate(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAmount(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function buildPayload(body: SharedTruckBody): { payload: SharedTruckPayload } | { error: string } {
  const compulsoryInsuranceExpiresAt = parseDate(body.compulsoryInsuranceExpiresAt);
  const cargoInsuranceAmount = parseAmount(body.cargoInsuranceAmount);
  const textFields = {
    headPlateNumber: text(body.headPlateNumber),
    tailPlateNumber: text(body.tailPlateNumber),
    vehicleInsuranceType: text(body.vehicleInsuranceType),
    driverFirstName: text(body.driverFirstName),
    driverLastName: text(body.driverLastName),
    driverLicenseType: text(body.driverLicenseType),
    driverPhone: text(body.driverPhone),
    bankName: text(body.bankName),
    bankAccountNumber: text(body.bankAccountNumber),
    bankAccountName: text(body.bankAccountName),
  };

  const requiredMissing =
    !textFields.headPlateNumber ||
    !textFields.tailPlateNumber ||
    !compulsoryInsuranceExpiresAt ||
    !textFields.vehicleInsuranceType ||
    cargoInsuranceAmount === null ||
    !textFields.driverFirstName ||
    !textFields.driverLastName ||
    !textFields.driverLicenseType ||
    !textFields.driverPhone ||
    !textFields.bankName ||
    !textFields.bankAccountNumber;

  if (requiredMissing) {
    return { error: 'กรุณากรอกข้อมูลรถร่วมให้ครบถ้วน' };
  }

  return {
    payload: {
      ...textFields,
      compulsoryInsuranceExpiresAt,
      cargoInsuranceAmount,
    },
  };
}

function serializeSharedTruck(sharedTruck: ISharedTruck) {
  return {
    _id: sharedTruck._id.toString(),
    lineUserId: sharedTruck.lineUserId || '',
    onboardingStatus: sharedTruck.onboardingStatus || 'manual',
    gpsConsentStatus: sharedTruck.gpsConsentStatus || 'pending',
    gpsConsentAt: sharedTruck.gpsConsentAt?.toISOString(),
    documentReviewNote: sharedTruck.documentReviewNote || '',
    headPlateNumber: sharedTruck.headPlateNumber,
    tailPlateNumber: sharedTruck.tailPlateNumber,
    compulsoryInsuranceExpiresAt: sharedTruck.compulsoryInsuranceExpiresAt?.toISOString(),
    vehicleInsuranceType: sharedTruck.vehicleInsuranceType,
    cargoInsuranceAmount: sharedTruck.cargoInsuranceAmount,
    driverFirstName: sharedTruck.driverFirstName,
    driverLastName: sharedTruck.driverLastName,
    driverLicenseType: sharedTruck.driverLicenseType,
    driverPhone: sharedTruck.driverPhone,
    bankName: sharedTruck.bankName,
    bankAccountNumber: sharedTruck.bankAccountNumber,
    bankAccountName: sharedTruck.bankAccountName || '',
    createdAt: sharedTruck.createdAt?.toISOString(),
    updatedAt: sharedTruck.updatedAt?.toISOString(),
  };
}

async function requireOwner(req: NextRequest) {
  const token = await getSessionToken(req);
  if (!token) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  // Allow system_owner, owner, admin, and operator to view shared trucks
  const allowedRoles = ['system_owner', 'owner', 'admin', 'operator'];
  if (!token.role || !allowedRoles.includes(token.role)) {
    return { response: NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 }) };
  }

  return { token };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOwner(req);
    if ('response' in auth) return auth.response;

    await connectToDatabase();
    const sharedTrucks = await SharedTruck.find({}).sort({ updatedAt: -1 });
    return NextResponse.json(sharedTrucks.map(serializeSharedTruck));
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลรถร่วมได้' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireOwner(req);
    if ('response' in auth) return auth.response;

    const body = await req.json() as SharedTruckBody;
    const result = buildPayload(body);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await connectToDatabase();
    const sharedTruck = await SharedTruck.create(result.payload);
    return NextResponse.json({ message: 'เพิ่มข้อมูลรถร่วมสำเร็จ', sharedTruck: serializeSharedTruck(sharedTruck) }, { status: 201 });
  } catch (error: unknown) {
    const code = (error as { code?: number }).code;
    const message = code === 11000 ? 'ทะเบียนรถหัวและหางชุดนี้มีอยู่แล้ว' : 'เพิ่มข้อมูลรถร่วมไม่สำเร็จ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireOwner(req);
    if ('response' in auth) return auth.response;

    const body = await req.json() as SharedTruckBody;
    const sharedTruckId = text(body.sharedTruckId);
    if (!sharedTruckId) {
      return NextResponse.json({ error: 'ไม่พบรหัสข้อมูลรถร่วม' }, { status: 400 });
    }

    const result = buildPayload(body);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await connectToDatabase();
    const sharedTruck = await SharedTruck.findByIdAndUpdate(sharedTruckId, result.payload, { new: true });
    if (!sharedTruck) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลรถร่วมที่ต้องการแก้ไข' }, { status: 404 });
    }

    return NextResponse.json({ message: 'บันทึกข้อมูลรถร่วมสำเร็จ', sharedTruck: serializeSharedTruck(sharedTruck) });
  } catch (error: unknown) {
    const code = (error as { code?: number }).code;
    const message = code === 11000 ? 'ทะเบียนรถหัวและหางชุดนี้มีอยู่แล้ว' : 'บันทึกข้อมูลรถร่วมไม่สำเร็จ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireOwner(req);
    if ('response' in auth) return auth.response;

    const url = new URL(req.url);
    const idFromQuery = url.searchParams.get('sharedTruckId');
    const body = await req.json().catch(() => ({} as SharedTruckBody));
    const sharedTruckId = idFromQuery || text(body.sharedTruckId);

    if (!sharedTruckId) {
      return NextResponse.json({ error: 'ไม่พบรหัสข้อมูลรถร่วมที่ต้องการลบ' }, { status: 400 });
    }

    await connectToDatabase();
    const deleted = await SharedTruck.findByIdAndDelete(sharedTruckId);
    if (!deleted) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลรถร่วมที่ต้องการลบ' }, { status: 404 });
    }

    return NextResponse.json({ message: 'ลบข้อมูลรถร่วมสำเร็จ' });
  } catch {
    return NextResponse.json({ error: 'ลบข้อมูลรถร่วมไม่สำเร็จ' }, { status: 500 });
  }
}
