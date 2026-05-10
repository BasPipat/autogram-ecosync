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

  // Allow system_owner, owner, and admin to view driver documents
  const allowedRoles = ['system_owner', 'owner', 'admin'];
  if (!token.role || !allowedRoles.includes(token.role)) {
    return { response: NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 }) };
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
    
    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'รหัสเอกสารไม่ถูกต้อง' }, { status: 400 });
    }

    await connectToDatabase();
    const document = await DriverDocument.findById(id);
    
    if (!document) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลเอกสารในระบบ' }, { status: 404 });
    }

    // 1. Check if we have the content stored in MongoDB
    if (document.content) {
      const mime = document.mimeType || contentType(document.mediaType);
      const headers: Record<string, string> = {
        'Content-Type': mime,
        'Cache-Control': 'private, max-age=86400', // Cache for 24h
      };

      // Set content disposition to view in browser (inline) or download
      const disposition = mime.includes('pdf') || mime.includes('image') ? 'inline' : 'attachment';
      if (document.fileName) {
        headers['Content-Disposition'] = `${disposition}; filename="${encodeURIComponent(document.fileName)}"`;
      }

      return new Response(new Uint8Array(document.content), { headers });
    }

    // 2. Fallback to LINE (for older documents or if download failed)
    if (!document.lineMessageId) {
      if (document.mediaType === 'text') {
        return NextResponse.json({ error: 'เอกสารนี้เป็นข้อความ: ' + (document.textValue || '') }, { status: 400 });
      }
      return NextResponse.json({ error: 'ไม่พบไฟล์แนบของเอกสารนี้' }, { status: 404 });
    }

    try {
      const lineContent = await getLineClient().getMessageContent(document.lineMessageId);
      
      // Convert stream to Buffer to serve and potentially save
      const chunks: any[] = [];
      for await (const chunk of lineContent) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // Save to DB for future requests if not already saved
      await DriverDocument.findByIdAndUpdate(id, {
        content: buffer,
        size: buffer.length
      });

      const mime = document.mimeType || contentType(document.mediaType);
      const headers: Record<string, string> = {
        'Content-Type': mime,
        'Cache-Control': 'private, max-age=300',
      };

      const disposition = mime.includes('pdf') || mime.includes('image') ? 'inline' : 'attachment';
      if (document.fileName) {
        headers['Content-Disposition'] = `${disposition}; filename="${encodeURIComponent(document.fileName)}"`;
      }

      return new Response(new Uint8Array(buffer), { headers });
    } catch (lineError: any) {
      console.error('LINE Content fetch error:', lineError);
      return NextResponse.json({ 
        error: 'ไม่สามารถดึงไฟล์จาก LINE ได้ (อาจหมดอายุแล้วและไม่ได้ถูกเก็บลง DB)',
        details: lineError?.message
      }, { status: 502 });
    }
  } catch (err: any) {
    console.error('Document API error:', err);
    return NextResponse.json({ error: 'ระบบขัดข้อง: ' + (err?.message || 'Unknown error') }, { status: 500 });
  }
}
