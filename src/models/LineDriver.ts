import mongoose, { Schema, Document, Model } from 'mongoose';

export type DriverDocumentType =
  | 'national_id'
  | 'driving_license'
  | 'head_registration'
  | 'tail_registration'
  | 'vehicle_insurance'
  | 'head_compulsory_insurance'
  | 'tail_compulsory_insurance'
  | 'cargo_insurance'
  | 'phone_number'
  | 'bank_account'
  | 'pod_image'
  | 'delivery_documents_video';

export type LineDriverStatus = 'new' | 'awaiting_documents' | 'under_review' | 'approved' | 'rejected' | 'suspended';

export interface ILineLocation {
  latitude: number;
  longitude: number;
  address?: string;
  updatedAt: Date;
}

export interface ILineDriver extends Document {
  _id: mongoose.Types.ObjectId;
  lineUserId: string;
  displayName?: string;
  pictureUrl?: string;
  status: LineDriverStatus;
  pendingDocumentType?: DriverDocumentType;
  phone?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  sharedTruckId?: mongoose.Types.ObjectId;
  activeTripId?: mongoose.Types.ObjectId;
  activeJobOfferId?: mongoose.Types.ObjectId;
  gpsConsentStatus: 'pending' | 'granted' | 'denied';
  gpsConsentAt?: Date;
  lastLocation?: ILineLocation;
  reviewNote?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LineLocationSchema = new Schema<ILineLocation>({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  address: { type: String, trim: true },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const LineDriverSchema = new Schema<ILineDriver>({
  lineUserId: { type: String, required: true, unique: true, index: true, trim: true },
  displayName: { type: String, trim: true },
  pictureUrl: { type: String, trim: true },
  status: {
    type: String,
    enum: ['new', 'awaiting_documents', 'under_review', 'approved', 'rejected', 'suspended'],
    default: 'new',
    index: true,
  },
  pendingDocumentType: {
    type: String,
    enum: [
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
    ],
  },
  phone: { type: String, trim: true },
  bankName: { type: String, trim: true },
  bankAccountNumber: { type: String, trim: true },
  bankAccountName: { type: String, trim: true },
  sharedTruckId: { type: Schema.Types.ObjectId, ref: 'SharedTruck', index: true },
  activeTripId: { type: Schema.Types.ObjectId, ref: 'Trip', index: true },
  activeJobOfferId: { type: Schema.Types.ObjectId, ref: 'JobOffer', index: true },
  gpsConsentStatus: { type: String, enum: ['pending', 'granted', 'denied'], default: 'pending' },
  gpsConsentAt: { type: Date },
  lastLocation: { type: LineLocationSchema },
  reviewNote: { type: String, trim: true },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
}, { timestamps: true });

LineDriverSchema.index({ status: 1, updatedAt: -1 });

export const LineDriver =
  (mongoose.models.LineDriver as Model<ILineDriver> | undefined) ||
  mongoose.model<ILineDriver>('LineDriver', LineDriverSchema);
