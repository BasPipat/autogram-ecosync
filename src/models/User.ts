import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username?: string; // 🟢 เพิ่มช่อง User ID ที่แก้ไขได้
  name: string;
  email: string;
  password?: string;
  role: string;
  companyName?: string;
  phone?: string;
}

const UserSchema = new Schema({
  username: { type: String, unique: true, sparse: true }, // 🟢 ให้เป็น Unique เพื่อใช้ Login
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, default: 'coordinator' },
  companyName: { type: String },
  phone: { type: String },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);