import mongoose, { Schema, Document } from 'mongoose';

interface IMapPin {
  lat: number;
  lng: number;
  address?: string;
  googleMapsUrl?: string;
}

interface IGpsSession {
  source: 'line_oa';
  status: 'inactive' | 'active' | 'stopped';
  isTracking: boolean;
  startedAt?: Date;
  stoppedAt?: Date;
  lastPingAt?: Date;
}

export interface ITrip extends Document {
  tripId: string;
  companyId?: mongoose.Types.ObjectId;
  truckMasterId?: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  origin: string;
  originMapUrl?: string;
  scheduledOriginDate?: Date;
  scheduledOriginTime?: string;
  originContactName?: string;
  originContactPhone?: string;
  
  destination: string;
  destinationMapUrl?: string;
  scheduledDestinationDate?: Date;
  scheduledDestinationTime?: string;
  destinationContactName?: string;
  destinationContactPhone?: string;
  
  originPin?: IMapPin;
  destinationPin?: IMapPin;
  vehicleCount?: number; // Default 1
  distance?: number; // km
  weight?: number;   // ton
  carbon: number;    // (legacy) backward compatible

  // ── TGO Compliance: Identity ──
  vehicleType?: string;     // e.g. 'Trailer 22-Wheel', '10-Wheel'
  licensePlate?: string;    // for audit verification
  driverName?: string;      // snapshot at trip close
  sharedTruckId?: mongoose.Types.ObjectId;
  lineUserId?: string;
  tailLicensePlate?: string;
  acceptedFreightPrice?: number;
  lineAssignmentStatus?: 'none' | 'offered' | 'accepted' | 'in_progress' | 'delivered' | 'documents_submitted' | 'payment_requested' | 'paid';
  lineJobOfferId?: mongoose.Types.ObjectId;
  lineAcceptedAt?: Date;
  deliveredAt?: Date;
  deliveryDocumentVideoMessageId?: string;
  paymentRequestedAt?: Date;

  // ── TGO Compliance: Calculated (Pre-computed Snapshot) ──
  tonKm?: number;           // weight × distance
  emissionFactor?: number;  // EF used at time of calculation (kgCO2e / ton-km)
  emissionKgCo2e?: number;  // tonKm × emissionFactor

  // ── TGO Compliance: Audit Trail ──
  tgoVersion?: string;           // e.g. 'TGO-2024'
  calculatedAt?: Date;           // when emission was computed
  settingSnapshotId?: mongoose.Types.ObjectId; // ref to Setting version used

  status: string;
  gpsSession?: IGpsSession;
  companyName?: string;
  customerName?: string;
  podImageUrl?: string;
}

const MapPinSchema = new Schema<IMapPin>({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String },
  googleMapsUrl: { type: String },
}, { _id: false });

const GpsSessionSchema = new Schema<IGpsSession>({
  source: { type: String, enum: ['line_oa'], default: 'line_oa' },
  status: { type: String, enum: ['inactive', 'active', 'stopped'], default: 'inactive' },
  isTracking: { type: Boolean, default: false },
  startedAt: { type: Date },
  stoppedAt: { type: Date },
  lastPingAt: { type: Date },
}, { _id: false });

const TripSchema = new Schema({
  tripId: { type: String, required: true, unique: true }, 
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
  truckMasterId: { type: Schema.Types.ObjectId, ref: 'TruckMaster' },
  driverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
  origin: { type: String, required: true },
  originMapUrl: { type: String },
  scheduledOriginDate: { type: Date },
  scheduledOriginTime: { type: String },
  originContactName: { type: String },
  originContactPhone: { type: String },

  destination: { type: String, required: true },
  destinationMapUrl: { type: String },
  scheduledDestinationDate: { type: Date },
  scheduledDestinationTime: { type: String },
  destinationContactName: { type: String },
  destinationContactPhone: { type: String },

  originPin: { type: MapPinSchema },
  destinationPin: { type: MapPinSchema },
  vehicleCount: { type: Number, default: 1 },
  distance: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  carbon: { type: Number, default: 0 }, // legacy

  // ── TGO Compliance: Identity ──
  vehicleType: { type: String },
  licensePlate: { type: String },
  driverName: { type: String },
  sharedTruckId: { type: Schema.Types.ObjectId, ref: 'SharedTruck', index: true },
  lineUserId: { type: String, index: true },
  tailLicensePlate: { type: String },
  acceptedFreightPrice: { type: Number },
  lineAssignmentStatus: {
    type: String,
    enum: ['none', 'offered', 'accepted', 'in_progress', 'delivered', 'documents_submitted', 'payment_requested', 'paid'],
    default: 'none',
    index: true,
  },
  lineJobOfferId: { type: Schema.Types.ObjectId, ref: 'JobOffer', index: true },
  lineAcceptedAt: { type: Date },
  deliveredAt: { type: Date },
  deliveryDocumentVideoMessageId: { type: String },
  paymentRequestedAt: { type: Date },

  // ── TGO Compliance: Calculated ──
  tonKm: { type: Number },
  emissionFactor: { type: Number },
  emissionKgCo2e: { type: Number },

  // ── TGO Compliance: Audit Trail ──
  tgoVersion: { type: String },
  calculatedAt: { type: Date },
  settingSnapshotId: { type: Schema.Types.ObjectId, ref: 'Setting' },

  status: { type: String, enum: ['No POD', 'Pending', 'Verified'], default: 'No POD' },
  gpsSession: { type: GpsSessionSchema, default: () => ({ source: 'line_oa', status: 'inactive', isTracking: false }) },
  companyName: { type: String }, 
  customerName: { type: String },
  podImageUrl: { type: String }, 
}, { timestamps: true });

TripSchema.index({ companyId: 1, createdAt: -1 });
TripSchema.index({ driverId: 1, createdAt: -1 });

export const Trip = mongoose.models.Trip || mongoose.model<ITrip>('Trip', TripSchema);
