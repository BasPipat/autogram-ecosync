import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Setting } from '@/models/Setting';
import { getSessionToken, isInternalRole } from '@/lib/access';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    const query = isInternalRole(token.role)
      ? { isActive: true, scope: 'global' }
      : { isActive: true, scope: 'company', companyId: token.companyId };
    const setting = await Setting.findOne(query).sort({ effectiveFrom: -1 }).lean();
    return NextResponse.json({ setting });
  } catch (error) {
    console.error('settings GET error', error);
    return NextResponse.json({ error: 'ดึงค่า Master Settings ไม่สำเร็จ' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isInternalRole(token.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    await connectToDatabase();

    await Setting.updateMany({ key: 'master-default', scope: 'global' }, { $set: { isActive: false } });
    const saved = await Setting.create({
      key: 'master-default',
      scope: 'global',
      fuelEfficiencyKmPerLiterDefault: Number(body.fuelEfficiencyKmPerLiterDefault),
      emissionFactorKgCo2PerLiter: Number(body.emissionFactorKgCo2PerLiter),
      standardReference: body.standardReference || 'TGO',
      effectiveFrom: new Date(),
      isActive: true,
    });

    return NextResponse.json({ message: 'อัปเดต Master Settings สำเร็จ', setting: saved });
  } catch (error) {
    console.error('settings PUT error', error);
    return NextResponse.json({ error: 'บันทึกค่าไม่สำเร็จ' }, { status: 500 });
  }
}
