
import { NextResponse } from 'next/server';
import { Client } from '@line/bot-sdk';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '@/lib/mongodb';
import { Setting } from '@/models/Setting';
import { LineDriver } from '@/models/LineDriver';

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
  try {
    await connectToDatabase();
    // 0. Cleanup: Delete all old rich menus to free up quota
    const oldMenus = await getLineClient().getRichMenuList();
    for (const menu of oldMenus) {
      await getLineClient().deleteRichMenu(menu.richMenuId);
    }

    // 1. Create DRIVER RICH MENU (This is the only one we need)
    const driverMenu: any = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: 'Driver Neon Menu V7 Final',
      chatBarText: 'เมนูคนขับรถ',
      areas: [
        { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: 'message', text: 'งานของฉัน' } },
        { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: 'message', text: 'ดูงาน' } },
        { bounds: { x: 0, y: 843, width: 1250, height: 843 }, action: { type: 'message', text: 'โปรไฟล์ของฉัน' } },
        { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: 'message', text: 'ข้อมูลรถ/เอกสาร' } }
      ]
    };

    const driverId = await getLineClient().createRichMenu(driverMenu);

    // 2. Upload Driver Image (2500x1686)
    const driverImgBuffer = fs.readFileSync(path.join(process.cwd(), 'public/assets/line/rich-menu-driver-v8.jpg'));

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
        standardReference: 'LINE CONFIG V7 NEON DRIVER-ONLY FINAL AUTO-SYNC',
        isActive: true
      },
      { upsert: true }
    );

    // 4. AUTO-SYNC: Re-link all approved drivers to the new Rich Menu
    const approvedDrivers = await LineDriver.find({ status: 'approved' }).select('lineUserId');
    const syncResults = { total: approvedDrivers.length, success: 0, fail: 0 };

    for (const driver of approvedDrivers) {
      if (driver.lineUserId && driver.lineUserId.startsWith('U')) {
        try {
          await getLineClient().linkRichMenuToUser(driver.lineUserId, driverId);
          syncResults.success++;
        } catch (e) {
          console.error(`Failed to link menu for ${driver.lineUserId}:`, e);
          syncResults.fail++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      driverId, 
      syncResults,
      info: `Cleanup, Setup, and Auto-Sync for ${syncResults.success} drivers completed.` 
    });
  } catch (err: any) {
    console.error('Setup Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
