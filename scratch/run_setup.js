
const { Client } = require('@line/bot-sdk');
const fs = require('fs');
const mongoose = require('mongoose');

// Simple env loader
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let value = parts.slice(1).join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    process.env[key] = value;
  }
});

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

if (!lineConfig.channelAccessToken) {
  console.error('ERROR: LINE_CHANNEL_ACCESS_TOKEN not found in .env.local');
  process.exit(1);
}

const client = new Client(lineConfig);

async function runSetup() {
  console.log('Starting Rich Menu Setup...');
  
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID;
  const liffBaseUrl = liffId ? `https://liff.line.me/${liffId}` : '';

  const publicMenu = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: 'Public Restricted Menu V3',
    chatBarText: 'กดเพื่อส่งเอกสาร',
    areas: [
      { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: 'message', text: 'บัญชีของคุณอยู่ระหว่างการตรวจสอบเอกสารครับ' } },
      { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: 'message', text: 'บัญชีของคุณอยู่ระหว่างการตรวจสอบเอกสารครับ' } },
      { bounds: { x: 0, y: 843, width: 1250, height: 843 }, action: { type: 'message', text: 'บัญชีของคุณอยู่ระหว่างการตรวจสอบเอกสารครับ' } },
      { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: 'message', text: 'กดส่งเอกสาร' } }
    ]
  };

  const driverMenu = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: 'Driver Hub Menu V3',
    chatBarText: 'เมนูคนขับรถ',
    areas: [
      { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: liffBaseUrl ? `${liffBaseUrl}/driver/my-mission` : 'https://autogram-ecosync.vercel.app/driver/my-mission' } },
      { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: liffBaseUrl ? `${liffBaseUrl}/driver/jobs` : 'https://autogram-ecosync.vercel.app/driver/jobs' } },
      { bounds: { x: 0, y: 843, width: 1250, height: 843 }, action: { type: 'uri', uri: liffBaseUrl ? `${liffBaseUrl}/driver/profile` : 'https://autogram-ecosync.vercel.app/driver/profile' } },
      { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: 'message', text: 'กดส่งเอกสาร' } }
    ]
  };

  try {
    console.log('Creating Public Menu...');
    const publicId = await client.createRichMenu(publicMenu);
    console.log('Created Public Menu:', publicId);

    console.log('Creating Driver Menu...');
    const driverId = await client.createRichMenu(driverMenu);
    console.log('Created Driver Menu:', driverId);

    console.log('Uploading Public Image...');
    const publicImg = fs.readFileSync('./public/assets/line/rich-menu-unverified-v6.jpg');
    await client.setRichMenuImage(publicId, publicImg);
    console.log('Public Image Uploaded.');

    console.log('Uploading Driver Image...');
    const driverImg = fs.readFileSync('./public/assets/line/rich-menu-driver-v6.jpg');
    await client.setRichMenuImage(driverId, driverImg);
    console.log('Driver Image Uploaded.');

    console.log('Setting Public as Default...');
    await client.setDefaultRichMenu(publicId);
    console.log('Public set as Default.');

    // Database Update
    console.log('Connecting to DB to update IDs...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const db = mongoose.connection.db;
    await db.collection('settings').updateOne(
      { key: 'line_config', scope: 'global' },
      { 
        $set: { 
          lineRichMenuIdDefault: publicId,
          lineRichMenuIdDriver: driverId,
          standardReference: 'LINE CONFIG V3',
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    console.log('DB Updated.');
    
    console.log('SUCCESS! Rich Menu Setup Complete.');
    process.exit(0);
  } catch (err) {
    console.dir(err, { depth: null });
    process.exit(1);
  }
}

runSetup();
