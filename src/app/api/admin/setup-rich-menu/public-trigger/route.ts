
import { NextResponse } from 'next/server';
import { Client } from '@line/bot-sdk';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '@/lib/mongodb';
import { Setting } from '@/models/Setting';
import { LineDriver } from '@/models/LineDriver';

export const dynamic = 'force-dynamic';

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

let lineClient: Client | null = null;
function getLineClient() {
  if (!lineClient) {
    lineClient = new Client(lineConfig);
  }
  return lineClient;
}

export async function GET() {
  const steps: string[] = [];
  try {
    await connectToDatabase();
    const accessToken = lineConfig.channelAccessToken;
    // 0. Cleanup
    steps.push('Cleaning up old menus');
    const oldMenus = await getLineClient().getRichMenuList();
    for (const menu of oldMenus) {
      await getLineClient().deleteRichMenu(menu.richMenuId);
    }

    // 1. Create Driver Menu
    steps.push('Creating Driver Menu');
    const driverMenu: any = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: 'Driver Neon V7 Final Auto-Sync',
      chatBarText: 'เมนูคนขับรถ',
      areas: [
        { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: 'message', text: 'งานของฉัน' } },
        { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: 'message', text: 'ดูงาน' } },
        { bounds: { x: 0, y: 843, width: 1250, height: 843 }, action: { type: 'message', text: 'โปรไฟล์ของฉัน' } },
        { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: 'message', text: 'ข้อมูลรถ/เอกสาร' } }
      ]
    };
    const driverId = await getLineClient().createRichMenu(driverMenu);

    // 2. Upload Driver Image
    steps.push('Uploading Driver Image');
    const driverImg = fs.readFileSync(path.join(process.cwd(), 'public/assets/line/rich-menu-driver-v8.jpg'));
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
        standardReference: 'LINE CONFIG V7 NEON DRIVER-ONLY FINAL AUTO-SYNC',
        isActive: true
      },
      { upsert: true }
    );

    // 4. AUTO-SYNC
    steps.push('Synchronizing all approved drivers');
    const approvedDrivers = await LineDriver.find({ status: 'approved' }).select('lineUserId');
    let successCount = 0;

    for (const driver of approvedDrivers) {
      if (driver.lineUserId && driver.lineUserId.startsWith('U')) {
        try {
          await getLineClient().linkRichMenuToUser(driver.lineUserId, driverId);
          successCount++;
        } catch (e) {
          console.error(`Sync fail for ${driver.lineUserId}:`, e);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      driverId, 
      syncedCount: successCount,
      totalApproved: approvedDrivers.length,
      steps 
    });
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message, 
      lastStep: steps[steps.length - 1]
    }, { status: 500 });
  }
}
