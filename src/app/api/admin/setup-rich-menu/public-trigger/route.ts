
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Setting } from '@/models/Setting';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: any[] = [];
  try {
    await connectToDatabase();
    const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || '2010054204-bv5oRtcL';
    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    const baseUrl = 'https://autogram-ecosync.vercel.app';

    // 1. Define Menus
    const menus = [
      {
        name: 'Public V7',
        payload: {
          size: { width: 2500, height: 1686 },
          selected: true,
          name: 'Public Neon Menu V7 Final',
          chatBarText: 'กดเพื่อลงทะเบียน',
          areas: [
            { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/register` } },
            { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/register` } },
            { bounds: { x: 0, y: 843, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/register` } },
            { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/register` } }
          ]
        },
        imgUrl: `${baseUrl}/assets/line/rich-menu-unverified-v7.jpg`
      },
      {
        name: 'Driver V7',
        payload: {
          size: { width: 2500, height: 1686 },
          selected: true,
          name: 'Driver Neon Menu V7 Final',
          chatBarText: 'เมนูคนขับรถ',
          areas: [
            { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/my-mission` } },
            { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/jobs` } },
            { bounds: { x: 0, y: 843, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/profile` } },
            { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: 'message', text: 'ติดต่อเจ้าหน้าที่' } }
          ]
        },
        imgUrl: `${baseUrl}/assets/line/rich-menu-driver-v7.jpg`
      }
    ];

    const ids: string[] = [];

    for (const menu of menus) {
      // Step A: Create Menu
      const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
        method: 'POST',
        headers,
        body: JSON.stringify(menu.payload)
      });
      const createData = await createRes.json();
      results.push({ step: `Create ${menu.name}`, status: createRes.status, data: createData });
      
      if (!createRes.ok) throw new Error(`Failed to create ${menu.name}: ${JSON.stringify(createData)}`);
      const richMenuId = createData.richMenuId;
      ids.push(richMenuId);

      // Step B: Upload Image
      const imgRes = await fetch(menu.imgUrl);
      if (!imgRes.ok) throw new Error(`Failed to fetch image ${menu.imgUrl}: ${imgRes.status}`);
      const buffer = Buffer.from(await imgRes.arrayBuffer());

      const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'image/jpeg'
        },
        body: buffer
      });
      
      let uploadData = {};
      try { uploadData = await uploadRes.json(); } catch(e) { uploadData = { msg: 'Binary or Empty' }; }
      
      results.push({ step: `Upload ${menu.name}`, status: uploadRes.status, data: uploadData });
      if (!uploadRes.ok) throw new Error(`Failed to upload ${menu.name}: ${JSON.stringify(uploadData)}`);
    }

    // Step C: Set Default
    const defaultRes = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${ids[0]}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    results.push({ step: 'Set Default', status: defaultRes.status });

    // Step D: Update DB
    await Setting.findOneAndUpdate(
      { key: 'line_config', scope: 'global' },
      { 
        lineRichMenuIdDefault: ids[0],
        lineRichMenuIdDriver: ids[1],
        standardReference: 'LINE CONFIG V7 NEON LIFF RAW DEBUG',
        isActive: true
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message, 
      results 
    }, { status: 500 });
  }
}
