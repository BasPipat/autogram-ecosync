import mongoose, { Schema, Document } from 'mongoose';

export interface ILocation extends Document {
  name: string;
  locationLink: string;
  contactPerson?: string;
  phoneNumber?: string;
  companyId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>({
  name: { type: String, required: true, trim: true, index: true },
  locationLink: { type: String, required: true, trim: true },
  contactPerson: { type: String, trim: true },
  phoneNumber: { type: String, trim: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
}, { timestamps: true });

LocationSchema.index({ companyId: 1, name: 1 }, { unique: true });

export const Location = mongoose.models.Location || mongoose.model<ILocation>('Location', LocationSchema);
