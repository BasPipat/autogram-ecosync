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

    const allowedRoles = ['system_owner', 'owner', 'admin'];
    if (!token.role || !allowedRoles.includes(token.role)) {
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
      try {
        let buffer: Buffer | undefined;

        // 1. Try to get from MongoDB first (Persistent storage)
        if (doc.content) {
          buffer = doc.content;
        } 
        // 2. Fallback to LINE if not in DB
        else if (doc.lineMessageId) {
          const lineContent = await lineClient.getMessageContent(doc.lineMessageId);
          const chunks = [];
          for await (const chunk of lineContent) {
            chunks.push(chunk);
          }
          buffer = Buffer.concat(chunks);
          
          // Auto-save to DB for next time
          await DriverDocument.findByIdAndUpdate(doc._id, {
            content: buffer,
            size: buffer.length
          });
        }

        if (buffer) {
          images.push({
            buffer,
            mimeType: doc.mimeType || 'image/jpeg'
          });
        }
      } catch (e) {
        console.error(`Failed to fetch content for doc ${doc._id}:`, e);
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
