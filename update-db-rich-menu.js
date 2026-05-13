const mongoose = require('mongoose');
const { connectToDatabase } = require('./src/lib/mongodb');
const { Setting } = require('./src/models/Setting');

async function updateConfig() {
  await connectToDatabase();
  const newRichMenuId = 'richmenu-0503760a42e09b329df7bbd08b2b94d6';
  
  const config = await Setting.findOne({ key: 'line_config' });
  if (config) {
    config.lineRichMenuIdDriver = newRichMenuId;
    await config.save();
    console.log('✅ Updated lineRichMenuIdDriver in DB to:', newRichMenuId);
  } else {
    console.log('❌ line_config not found in DB');
  }
  process.exit(0);
}

updateConfig();
