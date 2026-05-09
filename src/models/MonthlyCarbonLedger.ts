import mongoose, { Document, Schema } from 'mongoose';

export interface IMonthlyCarbonLedger extends Document {
  companyId?: mongoose.Types.ObjectId;
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
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
  year: { type: Number, required: true, index: true },
  month: { type: Number, required: true, index: true },
  monthKey: { type: String, required: true },
  totalTrips: { type: Number, required: true, default: 0 },
  totalDistanceKm: { type: Number, required: true, default: 0 },
  totalFuelLitersForecast: { type: Number, required: true, default: 0 },
  totalEmissionKgCo2e: { type: Number, required: true, default: 0 },
  generatedAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

MonthlyCarbonLedgerSchema.index({ companyId: 1, year: 1, month: 1 }, { unique: true });
MonthlyCarbonLedgerSchema.index({ monthKey: 1, companyId: 1 });

export const MonthlyCarbonLedger =
  mongoose.models.MonthlyCarbonLedger ||
  mongoose.model<IMonthlyCarbonLedger>('MonthlyCarbonLedger', MonthlyCarbonLedgerSchema);
