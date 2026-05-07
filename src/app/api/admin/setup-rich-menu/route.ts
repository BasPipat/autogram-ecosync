import { NextRequest, NextResponse } from 'next/server';
import { getLineClient } from '@/lib/line';
import { getSessionToken, isInternalRole } from '@/lib/access';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token || !isInternalRole(token.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lineClient = getLineClient();

    // 1. Create Rich Menu Object
    const richMenu = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: 'Driver Main Menu',
      chatBarText: 'เมนูคนขับรถ',
      areas: [
        {
          bounds: { x: 0, y: 0, width: 833, height: 1686 },
          action: { type: 'message', text: 'ดูงาน' },
        },
        {
          bounds: { x: 833, y: 0, width: 833, height: 1686 },
          action: { type: 'message', text: 'ลงทะเบียน' },
        },
        {
          bounds: { x: 1666, y: 0, width: 834, height: 1686 },
          action: { type: 'message', text: 'สถานะ' },
        },
      ],
    };

    // @ts-ignore - The type definition might be slightly different depending on version
    const richMenuId = await lineClient.createRichMenu(richMenu);

    // 2. Upload Image
    // Use the generated image path
    const imagePath = 'C:\\Users\\l3asp\\.gemini\\antigravity\\brain\\de73526f-f86e-49eb-a4f1-0351a7535b3a\\line_rich_menu_driver_1778137999071.png';
    
    if (fs.existsSync(imagePath)) {
      const buffer = fs.readFileSync(imagePath);
      await lineClient.setRichMenuImage(richMenuId, buffer);
    } else {
      return NextResponse.json({ error: 'Rich Menu Image not found at ' + imagePath }, { status: 404 });
    }

    // 3. Set as Default Rich Menu
    await lineClient.setDefaultRichMenu(richMenuId);

    return NextResponse.json({ success: true, richMenuId });
  } catch (error: any) {
    console.error('Setup Rich Menu error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
