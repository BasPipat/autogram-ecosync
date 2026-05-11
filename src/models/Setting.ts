import mongoose, { Schema, Document } from 'mongoose';

// ── Legacy: Fuel-efficiency based ──
export interface IFuelEfficiencyByVehicleType {
  typeName: string;
  minKmPerLiter: number;
  maxKmPerLiter: number;
}

// ── TGO Ton-KM based EF ──
export interface IEmissionFactorByVehicleType {
  vehicleType: string;   // e.g. 'Trailer 22-Wheel', '10-Wheel Truck'
  efTonKm: number;       // kgCO2e / ton-km (from TGO table)
  fuelType: string;      // e.g. 'Diesel B7'
  tgoRef: string;        // e.g. 'TGO Table 5.2-1'
}

export interface ISetting extends Document {
  key: string;
  scope: 'global' | 'company';
  companyId?: mongoose.Types.ObjectId;

  // Legacy fuel-based
  fuelEfficiencyByVehicleType?: IFuelEfficiencyByVehicleType[];
  emissionFactorKgCo2PerLiter: number;

  // TGO Ton-KM based (new)
  emissionFactorsByVehicleType?: IEmissionFactorByVehicleType[];

  // Metadata
  standardReference: string;
  version: string;            // e.g. 'TGO-2024'
  publishedBy?: string;       // email of system_owner who saved
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  lineRichMenuIdDefault?: string;
  lineRichMenuIdDriver?: string;
}

const VehicleTypeSchema = new Schema<IFuelEfficiencyByVehicleType>({
  typeName: { type: String, required: true, trim: true },
  minKmPerLiter: { type: Number, required: true, min: 0 },
  maxKmPerLiter: { type: Number, required: true, min: 0 },
}, { _id: false });

const EFByVehicleTypeSchema = new Schema<IEmissionFactorByVehicleType>({
  vehicleType: { type: String, required: true, trim: true },
  efTonKm: { type: Number, required: true, min: 0 },
  fuelType: { type: String, default: 'Diesel B7', trim: true },
  tgoRef: { type: String, default: 'TGO Standard', trim: true },
}, { _id: false });

const SettingSchema = new Schema<ISetting>({
  key: { type: String, required: true, trim: true },
  scope: { type: String, enum: ['global', 'company'], default: 'global' },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },

  fuelEfficiencyByVehicleType: { type: [VehicleTypeSchema], default: [] },
  emissionFactorKgCo2PerLiter: { type: Number, required: true, min: 0 },

  emissionFactorsByVehicleType: {
    type: [EFByVehicleTypeSchema],
    default: [
      { vehicleType: 'Trailer 22-Wheel', efTonKm: 0.0650, fuelType: 'Diesel B7', tgoRef: 'TGO Standard' },
      { vehicleType: '10-Wheel Truck',   efTonKm: 0.1120, fuelType: 'Diesel B7', tgoRef: 'TGO Standard' },
      { vehicleType: '6-Wheel Truck',    efTonKm: 0.1800, fuelType: 'Diesel B7', tgoRef: 'TGO Standard' },
      { vehicleType: 'Pickup',           efTonKm: 0.2400, fuelType: 'Diesel B7', tgoRef: 'TGO Standard' },
    ],
  },

  standardReference: { type: String, default: 'TGO' },
  version: { type: String, default: 'TGO-2024' },
  publishedBy: { type: String },
  effectiveFrom: { type: Date, default: Date.now },
  effectiveTo: { type: Date },
  isActive: { type: Boolean, default: true },
  lineRichMenuIdDefault: { type: String, trim: true },
  lineRichMenuIdDriver: { type: String, trim: true },
}, { timestamps: true });

SettingSchema.index({ key: 1, scope: 1, companyId: 1, effectiveFrom: -1 });

export const Setting = mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);
