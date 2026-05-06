import mongoose, { Schema, Document } from 'mongoose';

export interface ILocation extends Document {
  name: string;
  locationLink?: string;
  contactPerson?: string;
  phoneNumber?: string;
  companyId?: mongoose.Types.ObjectId;
  companyName?: string;
}

const LocationSchema = new Schema<ILocation>({
  name: { type: String, required: true, trim: true, index: true },
  locationLink: { type: String, trim: true },
  contactPerson: { type: String, trim: true },
  phoneNumber: { type: String, trim: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
  companyName: { type: String, index: true },
}, { timestamps: true });

// Ensure we can filter by either ID or Name
LocationSchema.index({ companyId: 1, name: 1 });
LocationSchema.index({ companyName: 1, name: 1 });

export const Location = mongoose.models.Location || mongoose.model<ILocation>('Location', LocationSchema);
