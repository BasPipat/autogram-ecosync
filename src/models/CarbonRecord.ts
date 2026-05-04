import mongoose, { Schema, Document } from 'mongoose';

const TEN_YEARS_IN_MS = 10 * 365 * 24 * 60 * 60 * 1000;

export interface ICarbonRecord extends Document {
  companyId: mongoose.Types.ObjectId;
  tripId: mongoose.Types.ObjectId;
  truckMasterId?: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  distanceKm: number;
  cargoWeightTon: number;
  fuelLitersUsed: number;
  emissionFactorKgCo2PerLiter: number;
  totalEmissionKgCo2e: number;
  standardReference: string;
  recordedAt: Date;
  expiresAt: Date;
}

const CarbonRecordSchema = new Schema<ICarbonRecord>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
  truckMasterId: { type: Schema.Types.ObjectId, ref: 'TruckMaster' },
  driverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
  distanceKm: { type: Number, required: true, min: 0 },
  cargoWeightTon: { type: Number, required: true, min: 0 },
  fuelLitersUsed: { type: Number, required: true, min: 0 },
  emissionFactorKgCo2PerLiter: { type: Number, required: true, min: 0 },
  totalEmissionKgCo2e: { type: Number, required: true, min: 0 },
  standardReference: { type: String, default: 'TGO' },
  recordedAt: { type: Date, default: Date.now },
  // TTL policy for 10-year retention
  expiresAt: { type: Date, default: () => new Date(Date.now() + TEN_YEARS_IN_MS) },
}, { timestamps: true });

CarbonRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
CarbonRecordSchema.index({ companyId: 1, recordedAt: -1 });
CarbonRecordSchema.index({ companyId: 1, tripId: 1 }, { unique: true });

export const CarbonRecord =
  mongoose.models.CarbonRecord || mongoose.model<ICarbonRecord>('CarbonRecord', CarbonRecordSchema);
