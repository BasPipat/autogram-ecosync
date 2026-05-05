import mongoose, { Schema, Document } from 'mongoose';

export interface ITruckMaster extends Document {
  brand: string;
  truckModel: string;
  vehicleType: string;        // e.g. 'Trailer 22-Wheel', '10-Wheel Truck'
  licensePlate?: string;       // ทะเบียนรถ
  defaultFuelEfficiencyKmPerLiter: number;
  isActive: boolean;
  companyId?: mongoose.Types.ObjectId;
  companyName?: string;
}

const TruckMasterSchema = new Schema<ITruckMaster>({
  brand: { type: String, required: true, trim: true },
  truckModel: { type: String, required: true, trim: true },
  vehicleType: { type: String, default: 'Trailer 22-Wheel', trim: true },
  licensePlate: { type: String, trim: true },
  defaultFuelEfficiencyKmPerLiter: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
  companyName: { type: String },
}, { timestamps: true });

TruckMasterSchema.index({ brand: 1, truckModel: 1 }, { unique: true });

export const TruckMaster =
  mongoose.models.TruckMaster || mongoose.model<ITruckMaster>('TruckMaster', TruckMasterSchema);
