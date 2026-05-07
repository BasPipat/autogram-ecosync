import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISharedTruck extends Document {
  lineUserId?: string;
  onboardingStatus?: 'manual' | 'awaiting_documents' | 'under_review' | 'approved' | 'rejected';
  gpsConsentStatus?: 'pending' | 'granted' | 'denied';
  gpsConsentAt?: Date;
  documentReviewNote?: string;
  headPlateNumber?: string;
  tailPlateNumber?: string;
  compulsoryInsuranceExpiresAt?: Date;
  vehicleInsuranceType?: string;
  cargoInsuranceAmount?: number;
  driverFirstName?: string;
  driverLastName?: string;
  driverLicenseType?: string;
  driverPhone?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SharedTruckSchema = new Schema<ISharedTruck>({
  lineUserId: { type: String, trim: true, index: true, sparse: true },
  onboardingStatus: {
    type: String,
    enum: ['manual', 'awaiting_documents', 'under_review', 'approved', 'rejected'],
    default: 'manual',
  },
  gpsConsentStatus: {
    type: String,
    enum: ['pending', 'granted', 'denied'],
    default: 'pending',
  },
  gpsConsentAt: { type: Date },
  documentReviewNote: { type: String, trim: true },
  headPlateNumber: { type: String, trim: true },
  tailPlateNumber: { type: String, trim: true },
  compulsoryInsuranceExpiresAt: { type: Date },
  vehicleInsuranceType: { type: String, trim: true },
  cargoInsuranceAmount: { type: Number, min: 0 },
  driverFirstName: { type: String, trim: true },
  driverLastName: { type: String, trim: true },
  driverLicenseType: { type: String, trim: true },
  driverPhone: { type: String, trim: true },
  bankName: { type: String, trim: true },
  bankAccountNumber: { type: String, trim: true },
  bankAccountName: { type: String, trim: true },
}, { timestamps: true });

SharedTruckSchema.index({ headPlateNumber: 1, tailPlateNumber: 1 });
SharedTruckSchema.index({ compulsoryInsuranceExpiresAt: 1 });
SharedTruckSchema.index({ driverFirstName: 1, driverLastName: 1 });

export const SharedTruck =
  (mongoose.models.SharedTruck as Model<ISharedTruck> | undefined) ||
  mongoose.model<ISharedTruck>('SharedTruck', SharedTruckSchema);
