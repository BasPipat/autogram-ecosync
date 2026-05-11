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

      // 1. Create PUBLIC RICH MENU (1 Button)
      const publicMenu = {
        size: { width: 2500, height: 1686 },
        selected: true,
        name: 'Public Register Menu',
        chatBarText: 'ลงทะเบียน',
        areas: [
          {
            bounds: { x: 0, y: 0, width: 2500, height: 1686 },
            action: { 
              type: 'uri', 
              uri: liffBaseUrl ? `${liffBaseUrl}/driver/register` : 'https://eco-sync.vercel.app/driver/register' 
            }
          }
        ]
      };

      // 2. Create DRIVER RICH MENU (4 Buttons)
      const driverMenu = {
        size: { width: 2500, height: 1686 },
        selected: true,
        name: 'Driver Hub Menu',
        chatBarText: 'เมนูคนขับรถ',
        areas: [
          // Top Left: My Mission
          {
            bounds: { x: 0, y: 0, width: 1250, height: 843 },
            action: { 
              type: 'uri', 
              uri: liffBaseUrl ? `${liffBaseUrl}/driver/my-mission` : 'https://eco-sync.vercel.app/driver/my-mission' 
            }
          },
          // Top Right: Load Board
          {
            bounds: { x: 1250, y: 0, width: 1250, height: 843 },
            action: { 
              type: 'uri', 
              uri: liffBaseUrl ? `${liffBaseUrl}/driver/jobs` : 'https://eco-sync.vercel.app/driver/jobs' 
            }
          },
          // Bottom Left: Profile
          {
            bounds: { x: 0, y: 843, width: 1250, height: 843 },
            action: { 
              type: 'uri', 
              uri: liffBaseUrl ? `${liffBaseUrl}/driver/profile` : 'https://eco-sync.vercel.app/driver/profile' 
            }
          },
          // Bottom Right: Register (Update docs)
          {
            bounds: { x: 1250, y: 843, width: 1250, height: 843 },
            action: { 
              type: 'uri', 
              uri: liffBaseUrl ? `${liffBaseUrl}/driver/register` : 'https://eco-sync.vercel.app/driver/register' 
            }
          }
        ]
      };

      // Register Menus with LINE
      // @ts-ignore
      const publicId = await lineClient.createRichMenu(publicMenu);
      // @ts-ignore
      const driverId = await lineClient.createRichMenu(driverMenu);

      // Upload Images
      const publicImgPath = 'C:\\Users\\l3asp\\.gemini\\antigravity\\brain\\f81690e1-3856-4ef7-992f-0462670ae43f\\public_rich_menu_mockup_1778519785946.png';
      const driverImgPath = 'C:\\Users\\l3asp\\.gemini\\antigravity\\brain\\f81690e1-3856-4ef7-992f-0462670ae43f\\driver_rich_menu_mockup_1778518436703.png';

      if (fs.existsSync(publicImgPath)) {
        await lineClient.setRichMenuImage(publicId, fs.readFileSync(publicImgPath));
      }
      if (fs.existsSync(driverImgPath)) {
        await lineClient.setRichMenuImage(driverId, fs.readFileSync(driverImgPath));
      }

      // Set Public as Default
      await lineClient.setDefaultRichMenu(publicId);

      // Save to Settings
      await Setting.findOneAndUpdate(
        { key: 'line_config', scope: 'global' },
        { 
          lineRichMenuIdDefault: publicId,
          lineRichMenuIdDriver: driverId,
          standardReference: 'LINE CONFIG',
          emissionFactorKgCo2PerLiter: 0,
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
