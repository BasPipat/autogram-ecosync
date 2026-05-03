import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username?: string;
  name: string;
  email: string;
  password?: string;
  role: string;
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
    enum: ['system_owner', 'operator', 'corporate_admin', 'coordinator', 'driver', 'admin', 'superadmin', 'customer'], 
    default: 'coordinator' 
  },
  companyName: { type: String },
  phone: { type: String },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  image: { type: String },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);