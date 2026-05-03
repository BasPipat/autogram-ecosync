import mongoose, { Schema, Document } from 'mongoose';

export interface ITrip extends Document {
  tripId: string;
  origin: string;
  originMapUrl?: string; 
  destination: string;
  destinationMapUrl?: string; 
  distance?: number; // 🟢 เพิ่มระยะทาง (km)
  weight?: number;   // 🟢 เพิ่มน้ำหนัก (ตัน)
  carbon: number;
  status: string;
  companyName?: string;
  podImageUrl?: string;
}

const TripSchema = new Schema({
  tripId: { type: String, required: true, unique: true }, 
  origin: { type: String, required: true }, 
  originMapUrl: { type: String }, 
  destination: { type: String, required: true }, 
  destinationMapUrl: { type: String }, 
  distance: { type: Number, default: 0 }, // 🟢
  weight: { type: Number, default: 0 },   // 🟢
  carbon: { type: Number, default: 0 }, 
  status: { type: String, enum: ['No POD', 'Pending', 'Verified'], default: 'No POD' },
  companyName: { type: String }, 
  podImageUrl: { type: String }, 
}, { timestamps: true });

export const Trip = mongoose.models.Trip || mongoose.model<ITrip>('Trip', TripSchema);