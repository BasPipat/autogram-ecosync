export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Location } from '@/models/Location';
import mongoose from 'mongoose';
import { getSessionToken, isInternalRole } from '@/lib/access';


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const data = await req.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid location ID format' }, { status: 400 });
    }

    await connectToDatabase();

    // Tenant Isolation
    const query: any = { _id: new mongoose.Types.ObjectId(id) };
    if (!isInternalRole(token.role)) {
      if (token.companyId) {
        query.$or = [
          { companyId: new mongoose.Types.ObjectId(token.companyId) },
          { companyName: token.companyName }
        ];
        delete query._id; // We'll combine them
        query._id = new mongoose.Types.ObjectId(id);
      } else {
        query.companyName = token.companyName;
      }
    }

    const updatedLocation = await Location.findOneAndUpdate(query, { $set: data }, { new: true });
    if (!updatedLocation) {
      return NextResponse.json({ error: 'ไม่พบสถานที่ หรือคุณไม่มีสิทธิ์แก้ไข' }, { status: 404 });
    }

    return NextResponse.json({ message: 'แก้ไขสถานที่สำเร็จ!', location: updatedLocation });
  } catch (error: any) {
    console.error('Update location error:', error);
    return NextResponse.json({ error: `เกิดข้อผิดพลาดในการแก้ไขสถานที่: ${error?.message || error}` }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid location ID format' }, { status: 400 });
    }

    await connectToDatabase();

    // Tenant Isolation
    const query: any = { _id: new mongoose.Types.ObjectId(id) };
    if (!isInternalRole(token.role)) {
      if (token.companyId) {
        query.$or = [
          { companyId: new mongoose.Types.ObjectId(token.companyId) },
          { companyName: token.companyName }
        ];
        delete query._id;
        query._id = new mongoose.Types.ObjectId(id);
      } else {
        query.companyName = token.companyName;
      }
    }

    const deletedLocation = await Location.findOneAndDelete(query);
    if (!deletedLocation) {
      return NextResponse.json({ error: 'ไม่พบสถานที่ หรือคุณไม่มีสิทธิ์ลบ' }, { status: 404 });
    }

    return NextResponse.json({ message: 'ลบสถานที่สำเร็จ!' });
  } catch (error: any) {
    console.error('Delete location error:', error);
    return NextResponse.json({ error: `เกิดข้อผิดพลาดในการลบสถานที่: ${error?.message || error}` }, { status: 500 });
  }
}
