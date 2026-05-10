export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getSessionToken, isInternalRole } from '@/lib/access';
import { DriverDocument } from '@/models/DriverDocument';


export async function DELETE(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isInternalRole(token.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing document ID' }, { status: 400 });
    }

    await connectToDatabase();
    const deleted = await DriverDocument.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'ลบเอกสารเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
