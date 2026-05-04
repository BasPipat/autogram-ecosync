import mongoose, { Schema, Document } from 'mongoose';

export interface ITruckMaster extends Document {
  brand: string;
  model: string;
  defaultFuelEfficiencyKmPerLiter: number;
  isActive: boolean;
}

const TruckMasterSchema = new Schema<ITruckMaster>({
  brand: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  defaultFuelEfficiencyKmPerLiter: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

TruckMasterSchema.index({ brand: 1, model: 1 }, { unique: true });

export const TruckMaster =
  mongoose.models.TruckMaster || mongoose.model<ITruckMaster>('TruckMaster', TruckMasterSchema);
