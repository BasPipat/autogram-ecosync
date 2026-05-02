import mongoose, { Schema, Document } from 'mongoose';

export interface ITrip extends Document {
  tripId: string;
  origin: string;
  destination: string;
  distanceKm: number;
  cargoWeightTons: number;
  driverId: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
}

const TripSchema: Schema = new Schema({
  tripId: { type: String, required: true, unique: true },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  distanceKm: { type: Number, required: true },
  cargoWeightTons: { type: Number, required: true },
  driverId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

export interface ICarbonLedger extends Document {
  tripId: string;
  emissionsKgCO2: number;
  calculationMethod: string;
  calculatedAt: Date;
}

const CarbonLedgerSchema: Schema = new Schema({
  tripId: { type: String, required: true, unique: true },
  emissionsKgCO2: { type: Number, required: true },
  calculationMethod: { type: String, default: 'TGO Standard' },
  calculatedAt: { type: Date, default: Date.now },
});

export interface IIntegrityVault extends Document {
  tripId: string;
  podImageUrl: string;
  isVerified: boolean;
  verifiedAt?: Date;
}

const IntegrityVaultSchema: Schema = new Schema({
  tripId: { type: String, required: true, unique: true },
  podImageUrl: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
});

export const Trip = mongoose.models.Trip || mongoose.model<ITrip>('Trip', TripSchema);
export const CarbonLedger = mongoose.models.CarbonLedger || mongoose.model<ICarbonLedger>('CarbonLedger', CarbonLedgerSchema);
export const IntegrityVault = mongoose.models.IntegrityVault || mongoose.model<IIntegrityVault>('IntegrityVault', IntegrityVaultSchema);

export interface IJobPool extends Document {
  jobTitle: string;        // เช่น "บ้านนา - ขอนแก่น"
  price: number;           // 2x,xxx
  requiredTrucks: number;  // จำนวนที่ต้องการทั้งหมด (เช่น 3)
  bookedTrucks: number;    // จำนวนที่จองแล้ว (เริ่มที่ 0)
  status: 'active' | 'full' | 'closed';
}

const JobPoolSchema: Schema = new Schema({
  jobTitle: { type: String, required: true },
  price: { type: Number, required: true },
  requiredTrucks: { type: Number, required: true },
  bookedTrucks: { type: Number, default: 0 },
  status: { type: String, default: 'active' }
});