import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IJobOffer extends Document {
  _id: mongoose.Types.ObjectId;
  tripId: mongoose.Types.ObjectId;
  tripCode: string;
  origin: string;
  originMapUrl?: string;
  destination: string;
  destinationMapUrl?: string;
  basePrice: number;
  driverPrice: number;
  discountPercent: number;
  status: 'open' | 'accepted' | 'expired' | 'cancelled';
  sentAt?: Date;
  expiresAt?: Date;
  acceptedAt?: Date;
  acceptedByLineUserId?: string;
  acceptedSharedTruckId?: mongoose.Types.ObjectId;
  acceptedDriverName?: string;
  acceptedHeadPlateNumber?: string;
  acceptedTailPlateNumber?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobOfferSchema = new Schema<IJobOffer>({
  tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
  tripCode: { type: String, required: true, trim: true, index: true },
  origin: { type: String, required: true, trim: true },
  originMapUrl: { type: String, trim: true },
  destination: { type: String, required: true, trim: true },
  destinationMapUrl: { type: String, trim: true },
  basePrice: { type: Number, required: true, min: 0 },
  driverPrice: { type: Number, required: true, min: 0 },
  discountPercent: { type: Number, default: 1, min: 0 },
  status: { type: String, enum: ['open', 'accepted', 'expired', 'cancelled'], default: 'open', index: true },
  sentAt: { type: Date },
  expiresAt: { type: Date, index: true },
  acceptedAt: { type: Date },
  acceptedByLineUserId: { type: String, trim: true, index: true },
  acceptedSharedTruckId: { type: Schema.Types.ObjectId, ref: 'SharedTruck' },
  acceptedDriverName: { type: String, trim: true },
  acceptedHeadPlateNumber: { type: String, trim: true },
  acceptedTailPlateNumber: { type: String, trim: true },
  createdBy: { type: String, trim: true },
}, { timestamps: true });

JobOfferSchema.index({ status: 1, sentAt: -1 });
JobOfferSchema.index({ tripId: 1, status: 1 });

export const JobOffer =
  (mongoose.models.JobOffer as Model<IJobOffer> | undefined) ||
  mongoose.model<IJobOffer>('JobOffer', JobOfferSchema);
