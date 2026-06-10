import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text');
    if (!text) {
      return NextResponse.json({ error: 'Text parameter is required' }, { status: 400 });
    }

    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=${encodeURIComponent(text)}`;
    
    // Fetch from Google Translate TTS with clean headers from our server
    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch TTS: ${response.status} ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
  }
}
