// setup-rich-menu.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// --- Helper: Read .env.local ---
function getEnv(key) {
  try {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith(`${key}=`)) {
          return line.trim().split('=')[1].replace(/"/g, '').trim();
        }
      }
    }
  } catch (err) {
    console.error('Error reading .env.local:', err);
  }
  return null;
}

// 🔴 ดึงค่าจาก .env.local อัตโนมัติ
const LINE_ACCESS_TOKEN = getEnv('LINE_CHANNEL_ACCESS_TOKEN'); 
const LIFF_ID = getEnv('NEXT_PUBLIC_LINE_LIFF_ID');
const IMAGE_PATH = './driver_rich_menu_mockup_fixed.png'; 

if (!LINE_ACCESS_TOKEN) {
  console.error("❌ ไม่พบ LINE_CHANNEL_ACCESS_TOKEN ใน .env.local");
  process.exit(1);
}

if (!LIFF_ID) {
  console.warn("⚠️ ไม่พบ NEXT_PUBLIC_LINE_LIFF_ID ใน .env.local (จะใช้ URL สำรองแทน)");
}

// 🔴 ลิงก์ LIFF หรือ URL ของคุณ
const liffBaseUrl = LIFF_ID ? `https://liff.line.me/${LIFF_ID}` : 'https://eco-sync.vercel.app';
const URL_MY_MISSION = `${liffBaseUrl}/driver/my-mission`;
const URL_JOBS = `${liffBaseUrl}/driver/jobs`;
const URL_PROFILE = `${liffBaseUrl}/driver/profile`;
const URL_REGISTER = `${liffBaseUrl}/driver/register`;

// 🔴 หากต้องการทดสอบกับไอดีคุณคนเดียว ให้ใส่ Line User ID ของคุณที่นี่
const TEST_LINE_USER_ID = ''; 

const headers = {
  'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

const richMenuData = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: "Driver Hub Main Menu",
  chatBarText: "เมนูคนขับรถ 🚛",
  areas: [
    {
      bounds: { x: 0, y: 0, width: 1250, height: 843 }, // ซ้ายบน
      action: { type: "uri", uri: URL_MY_MISSION }
    },
    {
      bounds: { x: 1250, y: 0, width: 1250, height: 843 }, // ขวาบน
      action: { type: "uri", uri: URL_JOBS }
    },
    {
      bounds: { x: 0, y: 843, width: 1250, height: 843 }, // ซ้ายล่าง
      action: { type: "uri", uri: URL_PROFILE }
    },
    {
      bounds: { x: 1250, y: 843, width: 1250, height: 843 }, // ขวาล่าง
      action: { type: "uri", uri: URL_REGISTER }
    }
  ]
};

async function setupRichMenu() {
  try {
    console.log("--- เริ่มการติดตั้ง Rich Menu ---");
    console.log(`- Token: ${LINE_ACCESS_TOKEN.substring(0, 10)}...`);
    console.log(`- LIFF ID: ${LIFF_ID || 'ไม่ได้ระบุ'}`);

    console.log("1. กำลังสร้างโครงสร้าง Rich Menu...");
    const createRes = await axios.post('https://api.line.me/v2/bot/richmenu', richMenuData, { headers });
    const richMenuId = createRes.data.richMenuId;
    console.log(`✅ สร้างสำเร็จ! ID: ${richMenuId}`);

    console.log("2. กำลังอัปโหลดรูปภาพ...");
    if (!fs.existsSync(IMAGE_PATH)) {
      console.error(`❌ ไม่พบไฟล์รูปภาพที่ ${IMAGE_PATH}`);
      return;
    }
    const imageBuffer = fs.readFileSync(IMAGE_PATH);
    await axios.post(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, imageBuffer, {
      headers: {
        ...headers,
        'Content-Type': 'image/png'
      }
    });
    console.log("✅ อัปโหลดรูปภาพสำเร็จ!");

    console.log("3. กำลังตั้งค่า Rich Menu...");
    if (TEST_LINE_USER_ID) {
      console.log(`- กำลังเชื่อมต่อกับ User: ${TEST_LINE_USER_ID} (โหมดทดสอบเฉพาะบุคคล)`);
      await axios.post(`https://api.line.me/v2/bot/user/${TEST_LINE_USER_ID}/richmenu/${richMenuId}`, {}, { headers });
      console.log("✅ เชื่อมต่อเฉพาะบุคคลสำเร็จ! ลองเปิด LINE ดูผลลัพธ์ได้เลย");
    } else {
      console.log("- กำลังตั้งค่าให้เป็นเมนูเริ่มต้น (Default) สำหรับทุกคน...");
      await axios.post(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {}, { headers });
      console.log("✅ ตั้งค่าเริ่มต้นสำเร็จ! ทุกคนที่เข้า LINE OA จะเห็นเมนูนี้แล้ว");
    }

  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาด:");
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

setupRichMenu();
