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
  | 'delivery_documents_video'
  | 'onboarding_media'
  | 'onboarding_text'
  | 'vehicle_update';

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
  pendingTripId?: mongoose.Types.ObjectId;
  gpsConsentStatus: 'pending' | 'granted' | 'denied';
  gpsConsentAt?: Date;
  lastLocation?: ILineLocation;
  tempAnalysisResult?: any;
  reviewNote?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  licensePlate?: string;
  isDocumentsVerified?: boolean;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  pendingJobOfferCode?: string;

  // CFO Relevant Fields
  vehicleType?: string;
  engineSize?: string;
  fuelType?: string;
  cargoTypeCapability?: string[]; // e.g. ['ตู้', 'พื้นเรียบ']
  
  geoPoint?: { type: string, coordinates: number[] }; // GeoJSON for $near sorting
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
      'onboarding_media',
      'onboarding_text',
      'vehicle_update',
    ],
  },
  phone: { type: String, trim: true },
  bankName: { type: String, trim: true },
  bankAccountNumber: { type: String, trim: true },
  bankAccountName: { type: String, trim: true },
  sharedTruckId: { type: Schema.Types.ObjectId, ref: 'SharedTruck', index: true },
  activeTripId: { type: Schema.Types.ObjectId, ref: 'Trip', index: true },
  activeJobOfferId: { type: Schema.Types.ObjectId, ref: 'JobOffer', index: true },
  pendingTripId: { type: Schema.Types.ObjectId, ref: 'Trip', index: true },
  gpsConsentStatus: { type: String, enum: ['pending', 'granted', 'denied'], default: 'pending' },
  gpsConsentAt: { type: Date },
  lastLocation: { type: LineLocationSchema },
  tempAnalysisResult: { type: Schema.Types.Mixed },
  reviewNote: { type: String, trim: true },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  licensePlate: { type: String, trim: true },
  isDocumentsVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  pendingJobOfferCode: { type: String, trim: true },
  
  vehicleType: { type: String },
  engineSize: { type: String },
  fuelType: { type: String },
  cargoTypeCapability: { type: [String], default: [] },
  
  geoPoint: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  }
}, { timestamps: true });

LineDriverSchema.index({ geoPoint: '2dsphere' });

LineDriverSchema.index({ status: 1, updatedAt: -1 });

export const LineDriver =
  (mongoose.models.LineDriver as Model<ILineDriver> | undefined) ||
  mongoose.model<ILineDriver>('LineDriver', LineDriverSchema);
