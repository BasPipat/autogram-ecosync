import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: string;
  companyName?: string;
  phone?: string; // 🟢 ต้องมีบรรทัดนี้ ฐานข้อมูลถึงจะยอมจำเบอร์โทร
  customerId?: mongoose.Types.ObjectId;
  image?: string;
}

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { 
    type: String, 
    default: 'coordinator'
  },
  companyName: { type: String },
  phone: { type: String }, // 🟢 ต้องมีบรรทัดนี้ด้วยครับ
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  image: { type: String },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);