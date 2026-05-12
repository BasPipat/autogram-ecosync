
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

    // 1. Create Public Menu
    steps.push('Creating Public Menu');
    const publicMenu: any = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: 'Public V7 Neon',
      chatBarText: 'กดเพื่อลงทะเบียน',
      areas: [{ bounds: { x: 0, y: 0, width: 2500, height: 1686 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/register` } }]
    };
    const publicId = await lineClient.createRichMenu(publicMenu);

    // 2. Create Driver Menu
    steps.push('Creating Driver Menu');
    const driverMenu: any = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: 'Driver V7 Neon',
      chatBarText: 'เมนูคนขับรถ',
      areas: [
        { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/my-mission` } },
        { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/jobs` } },
        { bounds: { x: 0, y: 843, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/profile` } },
        { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: 'message', text: 'ติดต่อเจ้าหน้าที่' } }
      ]
    };
    const driverId = await lineClient.createRichMenu(driverMenu);

    // 3. Upload Public Image
    steps.push('Uploading Public Image');
    const publicImg = fs.readFileSync(path.join(process.cwd(), 'public/assets/line/rich-menu-unverified-v7.jpg'));
    const up1 = await fetch(`https://api-data.line.me/v2/bot/richmenu/${publicId}/content`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'image/jpeg' },
      body: publicImg
    });
    if (!up1.ok) {
      const errorText = await up1.text();
      throw new Error(`Public Image Upload Failed (${up1.status}): ${errorText}`);
    }

    // 4. Upload Driver Image
    steps.push('Uploading Driver Image');
    const driverImg = fs.readFileSync(path.join(process.cwd(), 'public/assets/line/rich-menu-driver-v7.jpg'));
    const up2 = await fetch(`https://api-data.line.me/v2/bot/richmenu/${driverId}/content`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'image/jpeg' },
      body: driverImg
    });
    if (!up2.ok) {
      const errorText = await up2.text();
      throw new Error(`Driver Image Upload Failed (${up2.status}): ${errorText}`);
    }

    // 5. Set Default
    steps.push('Setting Default Rich Menu');
    await lineClient.setDefaultRichMenu(publicId);

    // 6. Save to DB
    steps.push('Saving to Database');
    await Setting.findOneAndUpdate(
      { key: 'line_config', scope: 'global' },
      { 
        lineRichMenuIdDefault: publicId,
        lineRichMenuIdDriver: driverId,
        standardReference: 'LINE CONFIG V7 NEON STRICT',
        isActive: true
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, publicId, driverId, steps });
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message, 
      lastStep: steps[steps.length - 1],
      fullSteps: steps
    }, { status: 500 });
  }
}
