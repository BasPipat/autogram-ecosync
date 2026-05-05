import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { News } from '@/models/News';
import { getSessionToken, isInternalRole } from '@/lib/access';

export const dynamic = 'force-dynamic';

// Public: Get latest news for landing page
export async function GET() {
  try {
    await connectToDatabase();
    const news = await News.find({ isActive: true })
      .sort({ publishedAt: -1 })
      .limit(6)
      .lean();
    return NextResponse.json({ news });
  } catch (error) {
    console.error('news GET error', error);
    return NextResponse.json({ news: [] });
  }
}

// Admin: Create news article
export async function POST(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isInternalRole(token.role) && token.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    await connectToDatabase();

    const news = await News.create({
      title: body.title,
      summary: body.summary,
      content: body.content,
      category: body.category || 'announcement',
      source: body.source || 'internal',
      externalUrl: body.externalUrl,
      imageUrl: body.imageUrl,
      publishedAt: body.publishedAt || new Date(),
      publishedBy: token.email,
      isActive: true,
    });

    return NextResponse.json({ message: 'News created', news }, { status: 201 });
  } catch (error) {
    console.error('news POST error', error);
    return NextResponse.json({ error: 'Failed to create news' }, { status: 500 });
  }
}
