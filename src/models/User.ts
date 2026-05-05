import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'system_owner' | 'owner' | 'admin' | 'operator' | 'corp_admin' | 'coordinator';

export interface IUser extends Document {
  username?: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  companyId?: mongoose.Types.ObjectId;
  companyName?: string;
  phone?: string;
  customerId?: mongoose.Types.ObjectId;
  image?: string;
}

const UserSchema = new Schema({
  username: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: {
    type: String,
    enum: ['system_owner', 'owner', 'admin', 'operator', 'corp_admin', 'coordinator'],
    default: 'coordinator'
  },
  // Company-level isolation boundary (multi-tenant)
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
  companyName: { type: String },
  phone: { type: String },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  image: { type: String },
}, { timestamps: true });

UserSchema.index({ companyId: 1, role: 1 });

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);