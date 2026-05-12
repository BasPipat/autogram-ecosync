
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

    const publicMenu: any = {
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
    };

    const driverMenu: any = {
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
    };

    const publicId = await lineClient.createRichMenu(publicMenu);
    const driverId = await lineClient.createRichMenu(driverMenu);

    const baseUrl = 'https://autogram-ecosync.vercel.app';
    const publicImgRes = await fetch(`${baseUrl}/assets/line/rich-menu-unverified-v7.jpg`);
    const driverImgRes = await fetch(`${baseUrl}/assets/line/rich-menu-driver-v7.jpg`);

    if (publicImgRes.ok) {
      const buffer = Buffer.from(await publicImgRes.arrayBuffer());
      await fetch(`https://api-data.line.me/v2/bot/richmenu/${publicId}/content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lineConfig.channelAccessToken}`,
          'Content-Type': 'image/jpeg'
        },
        body: buffer
      });
    }

    if (driverImgRes.ok) {
      const buffer = Buffer.from(await driverImgRes.arrayBuffer());
      await fetch(`https://api-data.line.me/v2/bot/richmenu/${driverId}/content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lineConfig.channelAccessToken}`,
          'Content-Type': 'image/jpeg'
        },
        body: buffer
      });
    }

    await lineClient.setDefaultRichMenu(publicId);

    await Setting.findOneAndUpdate(
      { key: 'line_config', scope: 'global' },
      { 
        lineRichMenuIdDefault: publicId,
        lineRichMenuIdDriver: driverId,
        standardReference: 'LINE CONFIG V7 NEON LIFF FINAL',
        isActive: true
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, publicId, driverId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
