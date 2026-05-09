import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { News } from '@/models/News';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    const newsItem = await News.findOne({ _id: id, isActive: true }).lean();
    
    if (!newsItem) {
      return NextResponse.json({ error: 'News not found' }, { status: 404 });
    }

    return NextResponse.json({ news: newsItem });
  } catch (error) {
    console.error('news single GET error', error);
    return NextResponse.json({ error: 'Failed to fetch news item' }, { status: 500 });
  }
}
