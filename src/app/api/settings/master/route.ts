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

    // Also fetch version history (latest 10)
    const history = await Setting.find({ key: 'master-default', scope: 'global' })
      .sort({ effectiveFrom: -1 })
      .limit(10)
      .select('version publishedBy effectiveFrom isActive')
      .lean();

    return NextResponse.json({ setting, history });
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

    // Deactivate previous versions
    await Setting.updateMany({ key: 'master-default', scope: 'global' }, { $set: { isActive: false } });

    // Create new version (version control: previous records preserved)
    const saved = await Setting.create({
      key: 'master-default',
      scope: 'global',
      fuelEfficiencyByVehicleType: body.fuelEfficiencyByVehicleType || [],
      emissionFactorKgCo2PerLiter: Number(body.emissionFactorKgCo2PerLiter || 2.68),
      emissionFactorsByVehicleType: body.emissionFactorsByVehicleType || [],
      standardReference: body.standardReference || 'TGO',
      version: body.version || 'TGO-2024',
      publishedBy: token.email,
      effectiveFrom: new Date(),
      isActive: true,
    });

    return NextResponse.json({ message: 'อัปเดต Master Settings สำเร็จ (New Version Created)', setting: saved });
  } catch (error) {
    console.error('settings PUT error', error);
    return NextResponse.json({ error: 'บันทึกค่าไม่สำเร็จ' }, { status: 500 });
  }
}
