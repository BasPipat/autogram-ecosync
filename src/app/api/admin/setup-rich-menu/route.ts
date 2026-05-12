export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getLineClient } from '@/lib/line';
import { getSessionToken, isInternalRole } from '@/lib/access';
import { connectToDatabase } from '@/lib/mongodb';
import { Setting } from '@/models/Setting';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token || !isInternalRole(token.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, lineUserId } = await req.json();
    await connectToDatabase();
    const lineClient = getLineClient();

    // ─── ACTION: LINK RICH MENU TO USER ───
    if (action === 'link') {
      if (!lineUserId) return NextResponse.json({ error: 'Missing lineUserId' }, { status: 400 });
      
      const config = await Setting.findOne({ key: 'line_config', scope: 'global' });
      if (!config || !config.lineRichMenuIdDriver) {
        return NextResponse.json({ error: 'Driver Rich Menu not setup yet' }, { status: 400 });
      }

      await lineClient.linkRichMenuToUser(lineUserId, config.lineRichMenuIdDriver);
      return NextResponse.json({ success: true, message: 'Linked Driver Rich Menu' });
    }

    // ─── ACTION: SETUP (CREATE MENUS) ───
    if (action === 'setup') {
      const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID;
      const liffBaseUrl = liffId ? `https://liff.line.me/${liffId}` : '';
      const registerUrl = liffBaseUrl ? `${liffBaseUrl}/driver/register` : 'https://autogram-ecosync.vercel.app/driver/register';

      // 1. Create PUBLIC RICH MENU (Restricted - Highlight 'กดส่งเอกสาร')
      const publicMenu = {
        size: { width: 2500, height: 1686 },
        selected: true,
        name: 'Public Restricted Menu V2',
        chatBarText: 'กดเพื่อส่งเอกสาร',
        areas: [
          // Top Left: Restricted
          {
            bounds: { x: 0, y: 0, width: 1250, height: 843 },
            action: { type: 'message', text: 'บัญชีของคุณอยู่ระหว่างการตรวจสอบเอกสารครับ\n\nพิมพ์ "สถานะ" เพื่อตรวจสอบความคืบหน้า หรือพิมพ์ "ติดต่อเจ้าหน้าที่" ครับ' }
          },
          // Top Right: Restricted
          {
            bounds: { x: 1250, y: 0, width: 1250, height: 843 },
            action: { type: 'message', text: 'บัญชีของคุณอยู่ระหว่างการตรวจสอบเอกสารครับ เมื่อผ่านแล้วจะสามารถกดดูงานตรงนี้ได้ทันที\n\nพิมพ์ "สถานะ" เพื่อตรวจสอบครับ' }
          },
          // Bottom Left: Restricted
          {
            bounds: { x: 0, y: 843, width: 1250, height: 843 },
            action: { type: 'message', text: 'บัญชีของคุณอยู่ระหว่างการตรวจสอบเอกสารครับ\n\nพิมพ์ "สถานะ" เพื่อตรวจสอบครับ' }
          },
          // Bottom Right: Submit Docs (Personalized via Webhook)
          {

      // 1. Create PUBLIC RICH MENU
      const publicMenu: any = {
        size: { width: 2500, height: 1686 },
        selected: true,
        name: 'Public Neon Menu V7',
        chatBarText: 'กดเพื่อลงทะเบียน',
        areas: [
          // Top Left: My Mission -> Register
          { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/register` } },
          // Top Right: Load Board -> Register
          { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/register` } },
          // Bottom Left: Profile -> Register
          { bounds: { x: 0, y: 843, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/register` } },
          // Bottom Right: Register (Main)
          { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/register` } }
        ]
      };

      // 2. Create DRIVER RICH MENU
      const driverMenu: any = {
        size: { width: 2500, height: 1686 },
        selected: true,
        name: 'Driver Neon Menu V7',
        chatBarText: 'เมนูคนขับรถ',
        areas: [
          // Top Left: My Mission
          { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/my-mission` } },
          // Top Right: Load Board
          { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/jobs` } },
          // Bottom Left: Profile
          { bounds: { x: 0, y: 843, width: 1250, height: 843 }, action: { type: 'uri', uri: `https://liff.line.me/${liffId}/driver/profile` } },
          // Bottom Right: Support
          { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: 'message', text: 'ติดต่อเจ้าหน้าที่' } }
        ]
      };

      const publicId = await lineClient.createRichMenu(publicMenu);
      const driverId = await lineClient.createRichMenu(driverMenu);

      // Use the new PNG images we just uploaded
      const publicImgPath = path.join(process.cwd(), 'public/assets/line/rich-menu-unverified-v7.png');
      const driverImgPath = path.join(process.cwd(), 'public/assets/line/rich-menu-driver-v7.png');

      if (fs.existsSync(publicImgPath)) {
        await lineClient.setRichMenuImage(publicId, fs.readFileSync(publicImgPath));
      }
      if (fs.existsSync(driverImgPath)) {
        await lineClient.setRichMenuImage(driverId, fs.readFileSync(driverImgPath));
      }

      await lineClient.setDefaultRichMenu(publicId);

      // 4. Update Settings in Database
      await Setting.findOneAndUpdate(
        { key: 'line_config', scope: 'global' },
        { 
          lineRichMenuIdDefault: publicId,
          lineRichMenuIdDriver: driverId,
          standardReference: 'LINE CONFIG V7 NEON LIFF',
          isActive: true
        },
        { upsert: true }
      );

      return NextResponse.json({ success: true, publicId, driverId });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Setup Rich Menu error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
