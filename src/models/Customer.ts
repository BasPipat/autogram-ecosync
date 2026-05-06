import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  taxId: string;
  companyName: string;
  address?: string;
  email?: string;
  phoneNumber?: string;
  companyId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>({
  taxId: { type: String, required: true, trim: true, index: true },
  companyName: { type: String, required: true, trim: true },
  address: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phoneNumber: { type: String, trim: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
}, { timestamps: true });

// A tax ID should be unique within the same company's scope
CustomerSchema.index({ companyId: 1, taxId: 1 }, { unique: true });

export const Customer = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
