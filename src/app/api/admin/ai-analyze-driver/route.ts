export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getSessionToken, isInternalRole } from '@/lib/access';
import { DriverDocument } from '@/models/DriverDocument';
import { getLineClient } from '@/lib/line';
import { analyzeDriverDocuments } from '@/lib/gemini';
import { Readable } from 'node:stream';


export async function POST(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isInternalRole(token.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { lineUserId } = await req.json();
    if (!lineUserId) {
      return NextResponse.json({ error: 'Missing lineUserId' }, { status: 400 });
    }

    await connectToDatabase();

    // Find documents for this user (latest 5 images/files)
    const documents = await DriverDocument.find({
      lineUserId,
      mediaType: { $in: ['image', 'file'] }
    }).sort({ createdAt: -1 }).limit(5);

    if (documents.length === 0) {
      return NextResponse.json({ error: 'ไม่พบเอกสารที่อัปโหลดไว้สำหรับวิเคราะห์' }, { status: 404 });
    }

    const images: { buffer: Buffer; mimeType: string }[] = [];
    const lineClient = getLineClient();

    for (const doc of documents) {
      if (!doc.lineMessageId) continue;
      try {
        const lineContent = await lineClient.getMessageContent(doc.lineMessageId);
        // Convert stream to Buffer
        const chunks = [];
        for await (const chunk of lineContent) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        images.push({
          buffer,
          mimeType: doc.mimeType || 'image/jpeg'
        });
      } catch (e) {
        console.error(`Failed to fetch LINE content for message ${doc.lineMessageId}:`, e);
      }
    }

    if (images.length === 0) {
      return NextResponse.json({ error: 'ไม่สามารถดึงรูปภาพจาก LINE มาวิเคราะห์ได้' }, { status: 500 });
    }

    const analysisResult = await analyzeDriverDocuments(images);

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error('AI Analysis error:', error);
    return NextResponse.json({ error: 'การวิเคราะห์ล้มเหลว กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
