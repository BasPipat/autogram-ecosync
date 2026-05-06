import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { ObjectId } from 'mongodb';
import { getSessionToken, isInternalRole } from '@/lib/access';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const data = await req.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid trip ID format' }, { status: 400 });
    }

    await connectToDatabase();

    const query: any = { _id: new ObjectId(id) };
    if (!isInternalRole(token.role)) {
      if (token.companyId) {
         try { query.companyId = new ObjectId(token.companyId); } catch {}
      } else {
         query.companyName = token.companyName;
      }
    }

    const updatedTrip = await Trip.findOneAndUpdate(query, { $set: data }, { new: true });
    if (!updatedTrip) {
      return NextResponse.json({ error: 'ไม่พบงานที่ต้องการแก้ไข หรือคุณไม่มีสิทธิ์' }, { status: 404 });
    }

    return NextResponse.json({ message: 'แก้ไขงานสำเร็จ!', trip: updatedTrip });
  } catch (error: any) {
    console.error('Update trip error:', error);
    return NextResponse.json({ error: `เกิดข้อผิดพลาดในการแก้ไขงาน: ${error?.message || error}` }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid trip ID format' }, { status: 400 });
    }

    await connectToDatabase();

    const query: any = { _id: new ObjectId(id) };
    if (!isInternalRole(token.role)) {
      if (token.companyId) {
         try { query.companyId = new ObjectId(token.companyId); } catch {}
      } else {
         query.companyName = token.companyName;
      }
    }

    const deletedTrip = await Trip.findOneAndDelete(query);
    if (!deletedTrip) {
      return NextResponse.json({ error: 'ไม่พบงานที่ต้องการลบ หรือคุณไม่มีสิทธิ์' }, { status: 404 });
    }

    return NextResponse.json({ message: 'ลบงานสำเร็จ!' });
  } catch (error: any) {
    console.error('Delete trip error:', error);
    return NextResponse.json({ error: `เกิดข้อผิดพลาดในการลบงาน: ${error?.message || error}` }, { status: 500 });
  }
}
