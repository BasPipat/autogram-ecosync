import mongoose, { Schema, Document, Model } from 'mongoose';
import type { DriverDocumentType } from '@/models/LineDriver';

export interface IDriverDocument extends Document {
  _id: mongoose.Types.ObjectId;
  lineUserId: string;
  documentType: DriverDocumentType;
  mediaType: 'image' | 'video' | 'file' | 'text';
  lineMessageId?: string;
  textValue?: string;
  fileName?: string;
  mimeType?: string;
  content?: Buffer;
  size?: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  tripId?: mongoose.Types.ObjectId;
  jobOfferId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentTypes: DriverDocumentType[] = [
  'national_id',
  'driving_license',
  'head_registration',
  'tail_registration',
  'vehicle_insurance',
  'head_compulsory_insurance',
  'tail_compulsory_insurance',
  'cargo_insurance',
  'phone_number',
  'bank_account',
  'pod_image',
  'delivery_documents_video',
  'onboarding_media',
  'onboarding_text',
  'vehicle_update',
];

const DriverDocumentSchema = new Schema<IDriverDocument>({
  lineUserId: { type: String, required: true, index: true, trim: true },
  documentType: { type: String, required: true, enum: documentTypes, index: true },
  mediaType: { type: String, required: true, enum: ['image', 'video', 'file', 'text'] },
  lineMessageId: { type: String, trim: true },
  textValue: { type: String, trim: true },
  fileName: { type: String, trim: true },
  mimeType: { type: String, trim: true },
  content: { type: Buffer },
  size: { type: Number },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  reviewNote: { type: String, trim: true },
  tripId: { type: Schema.Types.ObjectId, ref: 'Trip', index: true },
  jobOfferId: { type: Schema.Types.ObjectId, ref: 'JobOffer', index: true },
}, { timestamps: true });

DriverDocumentSchema.index({ lineUserId: 1, documentType: 1, createdAt: -1 });

export const DriverDocument =
  (mongoose.models.DriverDocument as Model<IDriverDocument> | undefined) ||
  mongoose.model<IDriverDocument>('DriverDocument', DriverDocumentSchema);
