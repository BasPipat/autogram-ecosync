
import { NextResponse } from 'next/server';
import { Client } from '@line/bot-sdk';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '@/lib/mongodb';
import { Setting } from '@/models/Setting';

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

const lineClient = new Client(lineConfig);

export async function GET() {
  try {
    await connectToDatabase();
    const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || '2010054204-bv5oRtcL';

    // 0. Cleanup: Delete all old rich menus to free up quota
    const oldMenus = await lineClient.getRichMenuList();
    for (const menu of oldMenus) {
      await lineClient.deleteRichMenu(menu.richMenuId);
    }

    // 1. Create DRIVER RICH MENU (This is the only one we need)
    const driverMenu: any = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: 'Driver Neon Menu V7 Final',
      chatBarText: 'เมนูคนขับรถ',
      areas: [
        { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/my-mission` } },
        { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/jobs` } },
        { bounds: { x: 0, y: 843, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/profile` } },
        { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: 'message', text: 'ข้อมูลรถ/เอกสาร' } }
      ]
    };

    const driverId = await lineClient.createRichMenu(driverMenu);

    // 2. Upload Driver Image (2500x1686)
    const driverImgBuffer = fs.readFileSync(path.join(process.cwd(), 'public/assets/line/rich-menu-driver-v7.jpg'));

    const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${driverId}/content`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lineConfig.channelAccessToken}`,
        'Content-Type': 'image/jpeg'
      },
      body: driverImgBuffer
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      throw new Error(`Driver Image Upload Failed: ${errorText}`);
    }

    // 3. Update Database with the new ID
    await Setting.findOneAndUpdate(
      { key: 'line_config', scope: 'global' },
      { 
        lineRichMenuIdDefault: '', // No default menu for new users
        lineRichMenuIdDriver: driverId,
        standardReference: 'LINE CONFIG V7 NEON DRIVER-ONLY',
        isActive: true
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, driverId, info: 'Cleanup and Setup completed. Only Driver menu created.' });
  } catch (err: any) {
    console.error('Setup Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
