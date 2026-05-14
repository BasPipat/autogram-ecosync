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

const LINE_ACCESS_TOKEN = getEnv('LINE_CHANNEL_ACCESS_TOKEN'); 
const IMAGE_PATH = './driver_rich_menu_target.jpg'; 

if (!LINE_ACCESS_TOKEN) {
  console.error("❌ ไม่พบ LINE_CHANNEL_ACCESS_TOKEN ใน .env.local");
  process.exit(1);
}

// 🔴 เปลี่ยนเป็น URL ตรงของ Vercel ตามคำแนะนำของคุณ
const BASE_URL = 'https://autogram-ecosync.vercel.app';
const URL_MY_MISSION = `${BASE_URL}/driver/my-mission`;
const URL_JOBS = `${BASE_URL}/driver/jobs`;
const URL_PROFILE = `${BASE_URL}/driver/profile`;
const URL_REGISTER = `${BASE_URL}/driver/register`;

// 🔴 ใส่ไอดีของคุณเพื่อทดสอบทันที
const TEST_LINE_USER_ID = ''; 

const headers = {
  'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

const richMenuData = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: "Driver Hub Main Menu - V2",
  chatBarText: "เมนูคนขับรถ 🚛",
  areas: [
    {
      bounds: { x: 0, y: 0, width: 1250, height: 843 }, // ซ้ายบน (งานของฉัน)
      action: { type: "uri", uri: `https://liff.line.me/2010054204-bv5oRtcL` }
    },
    {
      bounds: { x: 1250, y: 0, width: 1250, height: 843 }, // ขวาบน (ดูงาน)
      action: { type: "uri", uri: `https://liff.line.me/2010054204-bv5oRtcL/driver/jobs` }
    },
    {
      bounds: { x: 0, y: 843, width: 1250, height: 843 }, // ซ้ายล่าง (โปรไฟล์ของฉัน)
      action: { type: "message", text: "โปรไฟล์ของฉัน" } // โปรไฟล์ยังคงใช้ message เพื่อให้บอทส่งบัตร Digital ID ที่มีรูปและข้อมูลสวยๆ ครับ
    },
    {
      bounds: { x: 1250, y: 843, width: 1250, height: 843 }, // ขวาล่าง (ข้อมูลรถ/เอกสาร)
      action: { type: "message", text: "ข้อมูลรถ/เอกสาร" }
    }
  ]
};

async function cleanupRichMenus() {
  try {
    console.log("--- เริ่มการล้างเมนูเก่า ---");
    const res = await axios.get('https://api.line.me/v2/bot/richmenu/list', { headers });
    const menus = res.data.richmenus || [];
    console.log(`- พบเมนูเดิม ${menus.length} รายการ`);
    
    for (const menu of menus) {
      console.log(`- กำลังลบ: ${menu.richMenuId} (${menu.name})`);
      await axios.delete(`https://api.line.me/v2/bot/richmenu/${menu.richMenuId}`, { headers });
    }
    console.log("✅ ล้างเมนูเก่าเรียบร้อย!");
  } catch (err) {
    console.error("⚠️ ล้างเมนูไม่สำเร็จ (อาจไม่มีเมนูให้ลบ):", err.message);
  }
}

async function setupRichMenu() {
  try {
    await cleanupRichMenus();

    console.log("\n--- เริ่มการติดตั้ง Rich Menu ใหม่ ---");
    console.log("1. กำลังสร้างโครงสร้าง Rich Menu...");
    const createRes = await axios.post('https://api.line.me/v2/bot/richmenu', richMenuData, { headers });
    const richMenuId = createRes.data.richMenuId;
    console.log(`✅ สร้างสำเร็จ! ID: ${richMenuId}`);

    console.log("2. กำลังอัปโหลดรูปภาพใหม่ (Clean Version)...");
    if (!fs.existsSync(IMAGE_PATH)) {
      console.error(`❌ ไม่พบไฟล์รูปภาพที่ ${IMAGE_PATH}`);
      return;
    }
    const imageBuffer = fs.readFileSync(IMAGE_PATH);
    await axios.post(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, imageBuffer, {
      headers: {
        ...headers,
        'Content-Type': 'image/jpeg'
      }
    });
    console.log("✅ อัปโหลดรูปภาพสำเร็จ!");

    console.log("3. กำลังตั้งค่า Rich Menu...");
    if (TEST_LINE_USER_ID) {
      console.log(`- กำลังเชื่อมต่อกับ User: ${TEST_LINE_USER_ID}`);
      await axios.post(`https://api.line.me/v2/bot/user/${TEST_LINE_USER_ID}/richmenu/${richMenuId}`, {}, { headers });
      console.log("✅ เชื่อมต่อเฉพาะบุคคลสำเร็จ!");
    } else {
      console.log("- กำลังตั้งค่าให้เป็นเมนูเริ่มต้น (Default) สำหรับทุกคน...");
      await axios.post(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {}, { headers });
      console.log("✅ ตั้งค่าเริ่มต้นสำเร็จ!");
    }
    
    console.log("\n🚀 ทุกอย่างเสร็จสิ้น! ลองเช็คใน LINE ได้เลยครับ");

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
