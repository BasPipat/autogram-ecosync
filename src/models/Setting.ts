import mongoose, { Schema, Document } from 'mongoose';

export interface IFuelEfficiencyByVehicleType {
  typeName: string;
  minKmPerLiter: number;
  maxKmPerLiter: number;
}

export interface ISetting extends Document {
  key: string;
  scope: 'global' | 'company';
  companyId?: mongoose.Types.ObjectId;
  fuelEfficiencyByVehicleType?: IFuelEfficiencyByVehicleType[];
  emissionFactorKgCo2PerLiter: number;
  standardReference: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
}

const VehicleTypeSchema = new Schema<IFuelEfficiencyByVehicleType>({
  typeName: { type: String, required: true, trim: true },
  minKmPerLiter: { type: Number, required: true, min: 0 },
  maxKmPerLiter: { type: Number, required: true, min: 0 },
}, { _id: false });

const SettingSchema = new Schema<ISetting>({
  key: { type: String, required: true, trim: true },
  scope: { type: String, enum: ['global', 'company'], default: 'global' },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
  fuelEfficiencyByVehicleType: { type: [VehicleTypeSchema], default: [] },
  emissionFactorKgCo2PerLiter: { type: Number, required: true, min: 0 },
  standardReference: { type: String, default: 'TGO' },
  effectiveFrom: { type: Date, default: Date.now },
  effectiveTo: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

SettingSchema.index({ key: 1, scope: 1, companyId: 1, effectiveFrom: -1 });

export const Setting = mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);
