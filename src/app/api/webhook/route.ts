import { NextResponse } from 'next/server';
import { Client, WebhookEvent, TextMessage, FlexMessage } from '@line/bot-sdk';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/EcoSync';

// ดึงกุญแจจากไฟล์ .env.local
const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events: WebhookEvent[] = body.events;

    // ถ้าไม่มี event ส่งมา ให้ตอบกลับไปว่า OK (LINE ชอบส่งมายืนยัน)
    if (!events || events.length === 0) {
      return NextResponse.json({ message: 'OK' }, { status: 200 });
    }

    await connectToDatabase();

    // วนลูปอ่านทุกข้อความที่คนขับส่งมา
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userText = event.message.text.trim();
        const userId = event.source.userId;

        // 🎯 เช็กว่าคนขับพิมพ์คำว่า "ของาน" หรือกดปุ่ม "ของาน" จาก Rich Menu
        if (userText === 'ของาน') {
          
          // ด่านที่ 2: เช็กว่าติดงานค้างอยู่ไหม (สถานะ pending หรือ in_progress)
          // *หมายเหตุ: ตรงนี้เราจำลองค้นหาจาก driverId ที่เป็น LINE ID ของเขา
          const activeTrip = await Trip.findOne({
            driverId: userId,
            status: { $in: ['pending', 'in_progress'] }
          });

          if (activeTrip) {
            // บล็อกทันที! ถ้ามีงานค้าง
            const replyMsg: TextMessage = {
              type: 'text',
              text: `⚠️ พี่ติดงานรหัส ${activeTrip.tripId} อยู่นะครับ\n\nรบกวนพี่จบงานปัจจุบัน และอัปโหลดหลักฐาน (รูป/VDO) ให้เรียบร้อยก่อน ถึงจะรับงานใหม่ได้ครับ 🚛💨`
            };
            await client.replyMessage(event.replyToken, replyMsg);
            continue;
          }

          // ด่านที่ 3: ถ้าว่างงาน ให้ส่ง "กระดานงาน (Job Board)" ไปให้เลือก
          // (เวอร์ชันนี้ผมจำลองการ์ด Flex Message ให้บอสเห็นภาพก่อนครับ)
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
                      { type: "text", text: "ค่าเที่ยว: 25,000 บาท", color: "#1DB446", margin: "md" },
                      { type: "text", text: "รถที่ต้องการ: 3 คัน (ว่าง 2)", size: "sm", color: "#666666", margin: "sm" }
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
                        action: { type: "postback", label: "กดรับงานนี้", data: "action=accept_job&jobId=JOB001" }
                      }
                    ]
                  }
                },
                {
                  type: "bubble",
                  body: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                      { type: "text", text: "🚢 แหลมฉบัง - แสมดำ", weight: "bold", size: "xl" },
                      { type: "text", text: "ค่าเที่ยว: 21,000 บาท", color: "#1DB446", margin: "md" },
                      { type: "text", text: "รถที่ต้องการ: 2 คัน (ว่าง 1)", size: "sm", color: "#666666", margin: "sm" }
                    ]
                  },
                  footer: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                      {
                        type: "button",
                        style: "primary",
                        color: "#0367D3",
                        action: { type: "postback", label: "กดรับงานนี้", data: "action=accept_job&jobId=JOB002" }
                      }
                    ]
                  }
                }
              ]
            }
          };
          await client.replyMessage(event.replyToken, jobBoardFlex);
        }
      }
    }

    return NextResponse.json({ message: 'Success' }, { status: 200 });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}