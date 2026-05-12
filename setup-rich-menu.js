// setup-rich-menu.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

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
const MONGODB_URI = getEnv('MONGODB_URI');
const IMAGE_DRIVER = './public/assets/line/rich-menu-driver.jpg';
const IMAGE_UNVERIFIED = './public/assets/line/rich-menu-unverified.jpg';

if (!LINE_ACCESS_TOKEN) {
  console.error("❌ ไม่พบ LINE_CHANNEL_ACCESS_TOKEN");
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

const BASE_URL = 'https://autogram-ecosync.vercel.app';
const URL_REGISTER = `${BASE_URL}/driver/register`;

// 1. Create PUBLIC RESTRICTED MENU
const publicMenuData = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: "Public Restricted Menu",
  chatBarText: "ลงทะเบียนใช้งาน",
  areas: [
    {
      bounds: { x: 0, y: 0, width: 1250, height: 843 },
      action: { type: "message", text: "บัญชีของคุณอยู่ระหว่างการตรวจสอบเอกสารครับ\n\nพิมพ์ \"สถานะ\" เพื่อตรวจสอบความคืบหน้าครับ" }
    },
    {
      bounds: { x: 1250, y: 0, width: 1250, height: 843 },
      action: { type: "message", text: "บัญชีของคุณอยู่ระหว่างการตรวจสอบเอกสารครับ เมื่อผ่านแล้วจะสามารถกดดูงานตรงนี้ได้ทันที" }
    },
    {
      bounds: { x: 0, y: 843, width: 1250, height: 843 },
      action: { type: "message", text: "บัญชีของคุณอยู่ระหว่างการตรวจสอบเอกสารครับ" }
    },
    {
      bounds: { x: 1250, y: 843, width: 1250, height: 843 },
      action: { type: "uri", uri: URL_REGISTER }
    }
  ]
};

// 2. Create DRIVER MAIN MENU
const driverMenuData = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: "Driver Main Menu",
  chatBarText: "เมนูคนขับรถ 🚛",
  areas: [
    { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: "uri", uri: `${BASE_URL}/driver/my-mission` } },
    { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: "uri", uri: `${BASE_URL}/driver/jobs` } },
    { bounds: { x: 0, y: 843, width: 1250, height: 843 }, action: { type: "uri", uri: `${BASE_URL}/driver/profile` } },
    { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: "uri", uri: URL_REGISTER } }
  ]
};

async function setup() {
  try {
    console.log("--- เริ่มการตั้งค่า Rich Menu ---");

    // Clear old menus
    const listRes = await axios.get('https://api.line.me/v2/bot/richmenu/list', { headers });
    for (const menu of listRes.data.richmenus || []) {
      await axios.delete(`https://api.line.me/v2/bot/richmenu/${menu.richMenuId}`, { headers });
    }
    console.log("✅ ล้างเมนูเก่าเรียบร้อย");

    // Create Menus
    const publicRes = await axios.post('https://api.line.me/v2/bot/richmenu', publicMenuData, { headers });
    const publicId = publicRes.data.richMenuId;
    console.log(`✅ สร้าง Restricted Menu สำเร็จ: ${publicId}`);

    const driverRes = await axios.post('https://api.line.me/v2/bot/richmenu', driverMenuData, { headers });
    const driverId = driverRes.data.richMenuId;
    console.log(`✅ สร้าง Driver Menu สำเร็จ: ${driverId}`);

    // Upload Images
    await axios.post(`https://api-data.line.me/v2/bot/richmenu/${publicId}/content`, fs.readFileSync(IMAGE_UNVERIFIED), {
      headers: { ...headers, 'Content-Type': 'image/jpeg' }
    });
    console.log("✅ อัปโหลดรูปภาพ Restricted Menu สำเร็จ");

    await axios.post(`https://api-data.line.me/v2/bot/richmenu/${driverId}/content`, fs.readFileSync(IMAGE_DRIVER), {
      headers: { ...headers, 'Content-Type': 'image/jpeg' }
    });
    console.log("✅ อัปโหลดรูปภาพ Driver Menu สำเร็จ");

    // Set Default
    await axios.post(`https://api.line.me/v2/bot/user/all/richmenu/${publicId}`, {}, { headers });
    console.log("✅ ตั้งค่า Restricted Menu เป็น Default เรียบร้อย");

    // Update DB
    if (MONGODB_URI) {
      console.log("\n--- กำลังอัปเดตข้อมูลลง Database ---");
      await mongoose.connect(MONGODB_URI);
      const Setting = mongoose.model('Setting', new mongoose.Schema({
        key: String,
        lineRichMenuIdDefault: String,
        lineRichMenuIdDriver: String,
        isActive: Boolean
      }), 'settings');

      await Setting.findOneAndUpdate(
        { key: 'line_config' },
        { 
          lineRichMenuIdDefault: publicId,
          lineRichMenuIdDriver: driverId,
          isActive: true
        },
        { upsert: true }
      );
      
      // Link Menu for already approved drivers
      const LineDriver = mongoose.model('LineDriver', new mongoose.Schema({
        lineUserId: String,
        status: String
      }), 'linedrivers');
      
      const approvedDrivers = await LineDriver.find({ status: 'approved' });
      console.log(`- พบคนขับที่ได้รับการอนุมัติแล้ว ${approvedDrivers.length} คน กำลัง Sync เมนู...`);
      
      for (const driver of approvedDrivers) {
        await axios.post(`https://api.line.me/v2/bot/user/${driver.lineUserId}/richmenu/${driverId}`, {}, { headers });
      }
      
      await mongoose.disconnect();
      console.log("✅ อัปเดต Database และ Sync คนขับเก่าเรียบร้อย!");
    }

    console.log("\n🚀 ทุกอย่างเสร็จสมบูรณ์! ลองเช็คใน LINE ได้เลยครับ");
  } catch (err) {
    console.error("❌ เกิดข้อผิดพลาด:", err.response?.data || err.message);
  }
}

setup();
