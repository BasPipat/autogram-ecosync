// setup-rich-menu.js
const axios = require('axios');
const fs = require('fs');

// 🔴 สิ่งที่คุณต้องเปลี่ยนก่อนรัน
const LINE_ACCESS_TOKEN = 'YOUR_LINE_CHANNEL_ACCESS_TOKEN'; // เอามาจาก LINE Developers
const IMAGE_PATH = './driver_rich_menu_mockup.png'; 

// 🔴 ลิงก์ LIFF หรือ URL ของคุณ (เปลี่ยนเป็น URL จริงของคุณได้เลย)
const URL_MY_MISSION = 'https://liff.line.me/YOUR_LIFF_ID/driver/my-mission';
const URL_JOBS = 'https://liff.line.me/YOUR_LIFF_ID/driver/jobs';
const URL_PROFILE = 'https://liff.line.me/YOUR_LIFF_ID/driver/profile';
const URL_REGISTER = 'https://liff.line.me/YOUR_LIFF_ID/driver/register';

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
    console.log("1. กำลังสร้างโครงสร้าง Rich Menu...");
    const createRes = await axios.post('https://api.line.me/v2/bot/richmenu', richMenuData, { headers });
    const richMenuId = createRes.data.richMenuId;
    console.log(`✅ สร้างสำเร็จ! ID: ${richMenuId}`);

    console.log("2. กำลังอัปโหลดรูปภาพ...");
    const imageBuffer = fs.readFileSync(IMAGE_PATH);
    await axios.post(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, imageBuffer, {
      headers: {
        ...headers,
        'Content-Type': 'image/png' // หากใช้ jpg ให้เปลี่ยนเป็น image/jpeg
      }
    });
    console.log("✅ อัปโหลดรูปภาพสำเร็จ!");

    console.log("3. กำลังตั้งค่าให้เป็นเมนูเริ่มต้น (Default) สำหรับทุกคน...");
    await axios.post(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {}, { headers });
    console.log("✅ ตั้งค่าเริ่มต้นสำเร็จ! ทุกคนที่เข้า LINE OA จะเห็นเมนูนี้แล้ว");

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
