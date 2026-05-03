import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'superadmin' | 'admin' | 'client_admin' | 'client_user' | 'driver';
  companyName?: string; // 👈 เพิ่มฟิลด์ชื่อบริษัทลูกค้า
  customerId?: mongoose.Types.ObjectId;
  image?: string;
}

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { 
    type: String, 
    // อัปเดตรายชื่อยศทั้งหมด
    enum: ['superadmin', 'admin', 'client_admin', 'client_user', 'driver'], 
    default: 'client_user' // ให้คนที่สมัครใหม่เป็นแค่ลูกน้องฝั่งลูกค้าไว้ก่อน
  },
  companyName: { type: String },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  image: { type: String },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);