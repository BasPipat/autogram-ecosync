import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISharedTruck extends Document {
  headPlateNumber: string;
  tailPlateNumber: string;
  compulsoryInsuranceExpiresAt: Date;
  vehicleInsuranceType: string;
  cargoInsuranceAmount: number;
  driverFirstName: string;
  driverLastName: string;
  driverLicenseType: string;
  driverPhone: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SharedTruckSchema = new Schema<ISharedTruck>({
  headPlateNumber: { type: String, required: true, trim: true },
  tailPlateNumber: { type: String, required: true, trim: true },
  compulsoryInsuranceExpiresAt: { type: Date, required: true },
  vehicleInsuranceType: { type: String, required: true, trim: true },
  cargoInsuranceAmount: { type: Number, required: true, min: 0 },
  driverFirstName: { type: String, required: true, trim: true },
  driverLastName: { type: String, required: true, trim: true },
  driverLicenseType: { type: String, required: true, trim: true },
  driverPhone: { type: String, required: true, trim: true },
  bankName: { type: String, required: true, trim: true },
  bankAccountNumber: { type: String, required: true, trim: true },
  bankAccountName: { type: String, trim: true },
}, { timestamps: true });

SharedTruckSchema.index({ headPlateNumber: 1, tailPlateNumber: 1 }, { unique: true });
SharedTruckSchema.index({ compulsoryInsuranceExpiresAt: 1 });
SharedTruckSchema.index({ driverFirstName: 1, driverLastName: 1 });

export const SharedTruck =
  (mongoose.models.SharedTruck as Model<ISharedTruck> | undefined) ||
  mongoose.model<ISharedTruck>('SharedTruck', SharedTruckSchema);
