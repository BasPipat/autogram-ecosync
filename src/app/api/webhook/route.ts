import { NextResponse } from 'next/server';
import { Client, WebhookEvent, TextMessage, FlexMessage } from '@line/bot-sdk';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/EcoSync';

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events: WebhookEvent[] = body.events;

    if (!events || events.length === 0) {
      return NextResponse.json({ message: 'OK' }, { status: 200 });
    }

    await connectToDatabase();

    for (const event of events) {
      // --- 1. จัดการเมื่อคนขับพิมพ์ข้อความมา ---
      if (event.type === 'message' && event.message.type === 'text') {
        const userText = event.message.text.trim();
        const userId = event.source.userId;

        if (userText === 'ดูงาน') {
          const activeTrip = await Trip.findOne({
            driverId: userId,
            status: { $in: ['pending', 'in_progress'] }
          });

          if (activeTrip) {
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: `⚠️ พี่ติดงานรหัส ${activeTrip.tripId} อยู่นะครับ\n\nรบกวนพี่จบงานปัจจุบันให้เรียบร้อยก่อนครับ 🚛💨`
            });
            continue;
          }

          // ส่งกระดานงาน (Carousel)
          await client.replyMessage(event.replyToken, jobBoardFlex);
        }
      }

      // --- 2. จัดการเมื่อคนขับ "กดปุ่ม" รับงาน (Postback) ---
      if (event.type === 'postback') {
        const data = event.postback.data; // เช่น action=accept_job&jobId=JOB001

        if (data.includes('action=accept_job')) {
          // ดึง jobId มาโชว์ในการ์ด (สมมติว่าดึงจาก data)
          const params = new URLSearchParams(data);
          const jobId = params.get('jobId') || 'JOB-UNKNOWN';

          // ส่งการ์ดสีส้ม "ต้องการข้อมูลเพิ่ม" เพื่อถามน้ำหนัก
          await client.replyMessage(event.replyToken, weightSelectionFlex(jobId));
        }
      }
    }

    return NextResponse.json({ message: 'Success' }, { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// --- โซนออกแบบ Flex Message (ย้ายออกมาข้างนอกจะได้ไม่งงครับ) ---

// 1. กระดานงาน (Carousel)
const jobBoardFlex: FlexMessage = {
  type: 'flex',
  altText: 'มีงานใหม่เข้ามาครับ โปรดกดเลือกสายงาน',
  contents: {
    type: "carousel",
    contents: [
      {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: "🔥 สายบ้านนา - ขอนแก่น", weight: "bold", size: "xl" },
            { type: "text", text: "ค่าเที่ยว: 25,000 บาท", color: "#1DB446", margin: "md" }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#1DB446",
              action: { type: "postback", label: "กดรับงานนี้", data: "action=accept_job&jobId=JOB-260427-801" }
            }
          ]
        }
      }
    ]
  }
};

// 2. การ์ดสีส้ม ถามน้ำหนัก (ตามแบบที่บอสต้องการ)
const weightSelectionFlex = (jobId: string): FlexMessage => ({
  type: "flex",
  altText: "กรุณาแจ้งน้ำหนักบรรทุก",
  contents: {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#FF9800",
      contents: [
        { type: "text", text: "⚖️ ต้องการข้อมูลเพิ่ม", weight: "bold", color: "#ffffff", size: "md" },
        { type: "text", text: jobId, size: "xs", color: "#ffffffcc" }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: "📍 รับ: ชลบุรี", size: "sm", margin: "sm" },
            { type: "text", text: "📦 ส่ง: สมุทรปราการ", size: "sm", margin: "sm" }
          ]
        },
        { type: "separator" },
        { type: "text", text: "กรุณาพิมพ์น้ำหนักบรรทุก (ตัน)", weight: "bold", color: "#FF9800", size: "md", margin: "md" },
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          margin: "lg",
          contents: [
            { type: "button", style: "primary", color: "#FF9800", height: "sm", action: { type: "message", label: "0-5 ตัน", text: "น้ำหนัก 5 ตัน" } },
            { type: "button", style: "primary", color: "#FF9800", height: "sm", action: { type: "message", label: "10-15 ตัน", text: "น้ำหนัก 15 ตัน" } },
            { type: "button", style: "primary", color: "#FF9800", height: "sm", action: { type: "message", label: "18-22 ตัน", text: "น้ำหนัก 22 ตัน" } },
            { type: "button", style: "primary", color: "#FF9800", height: "sm", action: { type: "message", label: "25-28 ตัน", text: "น้ำหนัก 28 ตัน" } },
            { type: "button", style: "primary", color: "#FF9800", height: "sm", action: { type: "message", label: "30-33 ตัน", text: "น้ำหนัก 33 ตัน" } }
          ]
        }
      ]
    }
  }
});