import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  status: 'pending' | 'contacted' | 'rejected' | 'converted';
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>({
  name: { type: String, required: true, trim: true },
  companyName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'contacted', 'rejected', 'converted'], default: 'pending' },
}, { timestamps: true });

export const Lead = mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);
