import mongoose, { Schema, Document } from 'mongoose';

interface IDriverDocumentFile {
  url: string;
  uploadedAt: Date;
}

export interface IDriver extends Document {
  companyId: mongoose.Types.ObjectId;
  fullName: string;
  phone?: string;
  nationalIdNumber?: string;
  licenseNumber?: string;
  status: 'active' | 'inactive' | 'suspended';
  documents: {
    nationalIdCard?: IDriverDocumentFile;
    drivingLicense?: IDriverDocumentFile;
    insurancePolicy?: IDriverDocumentFile;
  };
}

const DriverDocumentFileSchema = new Schema<IDriverDocumentFile>({
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const DriverSchema = new Schema<IDriver>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  nationalIdNumber: { type: String, trim: true },
  licenseNumber: { type: String, trim: true },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  documents: {
    nationalIdCard: { type: DriverDocumentFileSchema },
    drivingLicense: { type: DriverDocumentFileSchema },
    insurancePolicy: { type: DriverDocumentFileSchema },
  },
}, { timestamps: true });

DriverSchema.index({ companyId: 1, fullName: 1 });
DriverSchema.index({ companyId: 1, licenseNumber: 1 });

export const Driver = mongoose.models.Driver || mongoose.model<IDriver>('Driver', DriverSchema);
