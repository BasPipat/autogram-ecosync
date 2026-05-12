// cleanup-web-drivers.js
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

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

const MONGODB_URI = getEnv('MONGODB_URI');

async function cleanup() {
  if (!MONGODB_URI) {
    console.error("❌ ไม่พบ MONGODB_URI");
    return;
  }

  try {
    console.log("--- เริ่มการล้างข้อมูล Driver ID ผิดปกติ (web-xxx) ---");
    await mongoose.connect(MONGODB_URI);
    
    const LineDriver = mongoose.model('LineDriver', new mongoose.Schema({
      lineUserId: String,
      displayName: String
    }), 'linedrivers');

    const result = await LineDriver.deleteMany({
      lineUserId: { $regex: /^web-/ }
    });

    console.log(`✅ ลบข้อมูลผิดปกติสำเร็จ: ${result.deletedCount} รายการ`);
    
    await mongoose.disconnect();
    console.log("🚀 ระบบสะอาดพร้อมใช้งานแล้วครับ!");
  } catch (err) {
    console.error("❌ เกิดข้อผิดพลาด:", err.message);
  }
}

cleanup();
