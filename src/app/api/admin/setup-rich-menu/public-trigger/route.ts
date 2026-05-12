
import { NextResponse } from 'next/server';
import { Client } from '@line/bot-sdk';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '@/lib/mongodb';
import { Setting } from '@/models/Setting';

export const dynamic = 'force-dynamic';

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

const lineClient = new Client(lineConfig);

export async function GET() {
  const steps: string[] = [];
  try {
    await connectToDatabase();
    const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || '2010054204-bv5oRtcL';
    const accessToken = lineConfig.channelAccessToken;

    // 0. Cleanup
    steps.push('Cleaning up old menus');
    const oldMenus = await lineClient.getRichMenuList();
    for (const menu of oldMenus) {
      await lineClient.deleteRichMenu(menu.richMenuId);
    }

    // 1. Create Driver Menu
    steps.push('Creating Driver Menu');
    const driverMenu: any = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: 'Driver Neon V7 Final',
      chatBarText: 'เมนูคนขับรถ',
      areas: [
        { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/my-mission` } },
        { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/jobs` } },
        { bounds: { x: 0, y: 843, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/profile` } },
        { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: 'message', text: 'ติดต่อเจ้าหน้าที่' } }
      ]
    };
    const driverId = await lineClient.createRichMenu(driverMenu);

    // 2. Upload Driver Image
    steps.push('Uploading Driver Image');
    const driverImg = fs.readFileSync(path.join(process.cwd(), 'public/assets/line/rich-menu-driver-v7.jpg'));
    const up = await fetch(`https://api-data.line.me/v2/bot/richmenu/${driverId}/content`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'image/jpeg' },
      body: driverImg
    });
    if (!up.ok) {
      const errorText = await up.text();
      throw new Error(`Image Upload Failed: ${errorText}`);
    }

    // 3. Save to DB
    steps.push('Saving to Database');
    await Setting.findOneAndUpdate(
      { key: 'line_config', scope: 'global' },
      { 
        lineRichMenuIdDefault: '',
        lineRichMenuIdDriver: driverId,
        standardReference: 'LINE CONFIG V7 NEON DRIVER-ONLY FINAL',
        isActive: true
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, driverId, steps });
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message, 
      lastStep: steps[steps.length - 1]
    }, { status: 500 });
  }
}
