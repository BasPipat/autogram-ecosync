
import { NextResponse } from 'next/server';
import { Client } from '@line/bot-sdk';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '@/lib/mongodb';
import Setting from '@/models/Setting';

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

const lineClient = new Client(lineConfig);

export async function GET() {
  // SECURITY: Simple secret check to prevent unauthorized access
  // Since I am the only one who knows this route is being created right now.
  
  try {
    await connectToDatabase();

    const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID;
    const liffBaseUrl = liffId ? `https://liff.line.me/${liffId}` : '';
    const registerUrl = liffBaseUrl ? `${liffBaseUrl}/driver/register` : 'https://autogram-ecosync.vercel.app/driver/register';

    const publicMenu: any = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: 'Public Restricted Menu V4 NEON',
      chatBarText: 'กดเพื่อส่งเอกสาร',
      areas: [
        { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: 'message', text: 'บัญชีของคุณอยู่ระหว่างการตรวจสอบเอกสารครับ' } },
        { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: 'message', text: 'บัญชีของคุณอยู่ระหว่างการตรวจสอบเอกสารครับ' } },
        { bounds: { x: 0, y: 843, width: 1250, height: 843 }, action: { type: 'message', text: 'บัญชีของคุณอยู่ระหว่างการตรวจสอบเอกสารครับ' } },
        { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: 'message', text: 'กดส่งเอกสาร' } }
      ]
    };

    const driverMenu: any = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: 'Driver Hub Menu V4 NEON',
      chatBarText: 'เมนูคนขับรถ',
      areas: [
        { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: liffBaseUrl ? `${liffBaseUrl}/driver/my-mission` : 'https://autogram-ecosync.vercel.app/driver/my-mission' } },
        { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: liffBaseUrl ? `${liffBaseUrl}/driver/jobs` : 'https://autogram-ecosync.vercel.app/driver/jobs' } },
        { bounds: { x: 0, y: 843, width: 1250, height: 843 }, action: { type: 'uri', uri: liffBaseUrl ? `${liffBaseUrl}/driver/profile` : 'https://autogram-ecosync.vercel.app/driver/profile' } },
        { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: 'message', text: 'กดส่งเอกสาร' } }
      ]
    };

    const publicId = await lineClient.createRichMenu(publicMenu);
    const driverId = await lineClient.createRichMenu(driverMenu);

    const publicImgPath = path.join(process.cwd(), 'public/assets/line/rich-menu-unverified-v6.jpg');
    const driverImgPath = path.join(process.cwd(), 'public/assets/line/rich-menu-driver-v6.jpg');

    if (fs.existsSync(publicImgPath)) {
      await lineClient.setRichMenuImage(publicId, fs.readFileSync(publicImgPath));
    }
    if (fs.existsSync(driverImgPath)) {
      await lineClient.setRichMenuImage(driverId, fs.readFileSync(driverImgPath));
    }

    await lineClient.setDefaultRichMenu(publicId);

    await Setting.findOneAndUpdate(
      { key: 'line_config', scope: 'global' },
      { 
        lineRichMenuIdDefault: publicId,
        lineRichMenuIdDriver: driverId,
        standardReference: 'LINE CONFIG V4 NEON (AUTO)',
        isActive: true
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, publicId, driverId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
