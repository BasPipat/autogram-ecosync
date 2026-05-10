export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import { connectToDatabase } from '@/lib/mongodb';
import { getSessionToken, isInternalRole } from '@/lib/access';
import { DriverDocument } from '@/models/DriverDocument';
import { getLineClient } from '@/lib/line';


async function requireInternal(req: NextRequest) {
  const token = await getSessionToken(req);
  if (!token) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!isInternalRole(token.role)) {
    return { response: NextResponse.json({ error: 'เฉพาะ System Owner เท่านั้น' }, { status: 403 }) };
  }

  return { token };
}

function contentType(mediaType?: string) {
  if (mediaType === 'video') return 'video/mp4';
  if (mediaType === 'file') return 'application/octet-stream';
  return 'image/jpeg';
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireInternal(req);
    if ('response' in auth) return auth.response;

    const { id } = await context.params;
    await connectToDatabase();
    const document = await DriverDocument.findById(id);
    if (!document || !document.lineMessageId) {
      return NextResponse.json({ error: 'ไม่พบไฟล์เอกสารจาก LINE' }, { status: 404 });
    }

    const lineContent = await getLineClient().getMessageContent(document.lineMessageId);
    const stream = Readable.toWeb(lineContent) as ReadableStream;

    return new Response(stream, {
      headers: {
        'Content-Type': document.mimeType || contentType(document.mediaType),
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถเปิดไฟล์เอกสารได้' }, { status: 500 });
  }
}
