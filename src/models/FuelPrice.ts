import mongoose, { Schema, Document } from 'mongoose';

export interface IFuelPrice extends Document {
  price: number;
  oilName: string;
  source: string;
  effectiveDate: Date; // The date this price is effective (YYYY-MM-DD at 00:00:00)
  createdAt: Date;
  updatedAt: Date;
}

const FuelPriceSchema = new Schema<IFuelPrice>({
  price: { type: Number, required: true },
  oilName: { type: String, default: 'Diesel B7', required: true },
  source: { type: String, default: 'Bangchak API', required: true },
  effectiveDate: { type: Date, required: true, unique: true, index: true },
}, { timestamps: true });

export const FuelPrice = mongoose.models.FuelPrice || mongoose.model<IFuelPrice>('FuelPrice', FuelPriceSchema);
