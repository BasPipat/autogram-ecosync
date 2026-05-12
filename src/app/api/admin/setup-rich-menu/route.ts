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
            bounds: { x: 1250, y: 843, width: 1250, height: 843 },
            action: { type: 'message', text: 'กดส่งเอกสาร' }
          }
        ]
      };

      // 2. Create DRIVER RICH MENU (Full - 4 Buttons)
      const driverMenu = {
        size: { width: 2500, height: 1686 },
        selected: true,
        name: 'Driver Hub Menu V2',
        chatBarText: 'เมนูคนขับรถ',
        areas: [
          // Top Left: My Mission
          {
            bounds: { x: 0, y: 0, width: 1250, height: 843 },
            action: { 
              type: 'uri', 
              uri: liffBaseUrl ? `${liffBaseUrl}/driver/my-mission` : 'https://autogram-ecosync.vercel.app/driver/my-mission' 
            }
          },
          // Top Right: Load Board
          {
            bounds: { x: 1250, y: 0, width: 1250, height: 843 },
            action: { 
              type: 'uri', 
              uri: liffBaseUrl ? `${liffBaseUrl}/driver/jobs` : 'https://autogram-ecosync.vercel.app/driver/jobs' 
            }
          },
          // Bottom Left: Profile
          {
            bounds: { x: 0, y: 843, width: 1250, height: 843 },
            action: { 
              type: 'message', 
              text: 'ดูโปรไฟล์'
            }
          },
          // Bottom Right: Update Docs
          {
            bounds: { x: 1250, y: 843, width: 1250, height: 843 },
            action: { type: 'message', text: 'กดส่งเอกสาร' }
          }
        ]
      };

      // Register Menus with LINE
      // @ts-ignore
      const publicId = await lineClient.createRichMenu(publicMenu);
      // @ts-ignore
      const driverId = await lineClient.createRichMenu(driverMenu);

      // Upload Images (Using new premium V6 optimized JPEGs)
      const publicImgPath = './public/assets/line/rich-menu-unverified-v6.jpg';
      const driverImgPath = './public/assets/line/rich-menu-driver-v6.jpg';

      if (fs.existsSync(publicImgPath)) {
        await lineClient.setRichMenuImage(publicId, fs.readFileSync(publicImgPath));
      } else {
        console.warn('Public image not found at:', publicImgPath);
      }
      
      if (fs.existsSync(driverImgPath)) {
        await lineClient.setRichMenuImage(driverId, fs.readFileSync(driverImgPath));
      } else {
        console.warn('Driver image not found at:', driverImgPath);
      }

      // Set Public as Default
      await lineClient.setDefaultRichMenu(publicId);

      // Save to Settings
      await Setting.findOneAndUpdate(
        { key: 'line_config', scope: 'global' },
        { 
          lineRichMenuIdDefault: publicId,
          lineRichMenuIdDriver: driverId,
          standardReference: 'LINE CONFIG V5 NEON',
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
