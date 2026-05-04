import mongoose, { Document, Schema } from 'mongoose';

export interface IMonthlyCarbonLedger extends Document {
  year: number;
  month: number;
  monthKey: string;
  totalTrips: number;
  totalDistanceKm: number;
  totalFuelLitersForecast: number;
  totalEmissionKgCo2e: number;
  generatedAt: Date;
}

const MonthlyCarbonLedgerSchema = new Schema<IMonthlyCarbonLedger>({
  year: { type: Number, required: true, index: true },
  month: { type: Number, required: true, index: true },
  monthKey: { type: String, required: true, unique: true },
  totalTrips: { type: Number, required: true, default: 0 },
  totalDistanceKm: { type: Number, required: true, default: 0 },
  totalFuelLitersForecast: { type: Number, required: true, default: 0 },
  totalEmissionKgCo2e: { type: Number, required: true, default: 0 },
  generatedAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

MonthlyCarbonLedgerSchema.index({ year: 1, month: 1 }, { unique: true });

export const MonthlyCarbonLedger =
  mongoose.models.MonthlyCarbonLedger ||
  mongoose.model<IMonthlyCarbonLedger>('MonthlyCarbonLedger', MonthlyCarbonLedgerSchema);
