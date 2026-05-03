import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  // อัปเดตชื่อยศตามที่บอสกำหนด
  role: 'system_owner' | 'operator' | 'corporate_admin' | 'coordinator' | 'driver';
  companyName?: string;
  customerId?: mongoose.Types.ObjectId;
  image?: string;
}

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { 
    type: String, 
    enum: ['system_owner', 'operator', 'corporate_admin', 'coordinator', 'driver'], 
    default: 'coordinator' // ค่าเริ่มต้นเวลาสมัครสมาชิกใหม่
  },
  companyName: { type: String },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  image: { type: String },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);