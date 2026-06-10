import mongoose, { Schema, Document } from 'mongoose';

interface IMapPin {
  lat: number;
  lng: number;
  address?: string;
  googleMapsUrl?: string;
  speed?: number; // Added for CFO calculation
  heading?: number; // Added for visual direction
  timestamp?: number; // Client-side timestamp
}

interface IGpsSession {
  source: 'line_oa' | 'web_platform';
  status: 'inactive' | 'active' | 'stopped';
  isTracking: boolean;
  startedAt?: Date;
  stoppedAt?: Date;
  lastPingAt?: Date;
  currentPin?: IMapPin; 
  locationHistory?: IMapPin[]; // Breadcrumbs for actual distance calculation
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
  originLocation?: { type: string, coordinates: number[] }; // GeoJSON for $near sorting
  destinationPin?: IMapPin;
  vehicleCount?: number; 
  distance?: number; 
  weight?: number;   
  carbon: number;    

  cargoType?: 'ตู้' | 'พื้นเรียบ' | 'โลวเบท';
  cargoName?: string;
  isPublic?: boolean;

  vehicleType?: string;     
  licensePlate?: string;    
  driverName?: string;      
  sharedTruckId?: mongoose.Types.ObjectId;
  lineUserId?: string;
  tailLicensePlate?: string;
  acceptedFreightPrice?: number;
  lineAssignmentStatus?: 'none' | 'offered' | 'accepted' | 'in_progress' | 'delivered' | 'documents_submitted' | 'payment_requested' | 'paid';
  opsStatus?: 'accepted' | 'en_route_pickup' | 'arrived_pickup' | 'en_route_dropoff' | 'delivered' | 'documents_submitted' | 'payment_requested' | 'paid';
  lineJobOfferId?: mongoose.Types.ObjectId;
  lineAcceptedAt?: Date;
  deliveredAt?: Date;
  deliveryDocumentVideoMessageId?: string;
  paymentRequestedAt?: Date;

  tonKm?: number;           
  emissionFactor?: number;  
  emissionKgCo2e?: number;  

  tgoVersion?: string;           
  calculatedAt?: Date;           
  settingSnapshotId?: mongoose.Types.ObjectId; 

  status: string;
  gpsSession?: IGpsSession;
  companyName?: string;
  customerName?: string;
  podImageUrl?: string;

  // Billing and Payment fields
  paymentType?: 'credit' | 'cash';
  paymentStatus?: 'unpaid' | 'pending_verification' | 'paid';
  billingDate?: Date;
  paymentDueDate?: Date;
  paymentSlipUrl?: string;
  paymentBatchId?: string;
  jobSheetReleased?: boolean;
  paymentTransRef?: string;
  paymentTransTime?: Date;
}

const MapPinSchema = new Schema<IMapPin>({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String },
  googleMapsUrl: { type: String },
  speed: { type: Number },
  heading: { type: Number },
  timestamp: { type: Number },
}, { _id: false });

const GpsSessionSchema = new Schema<IGpsSession>({
  source: { type: String, enum: ['line_oa', 'web_platform'], default: 'line_oa' },
  status: { type: String, enum: ['inactive', 'active', 'stopped'], default: 'inactive' },
  isTracking: { type: Boolean, default: false },
  startedAt: { type: Date },
  stoppedAt: { type: Date },
  lastPingAt: { type: Date },
  currentPin: { type: MapPinSchema },
  locationHistory: { type: [MapPinSchema], default: [] },
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
  carbon: { type: Number, default: 0 }, 

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
  opsStatus: {
    type: String,
    enum: ['accepted', 'en_route_pickup', 'arrived_pickup', 'en_route_dropoff', 'delivered', 'documents_submitted', 'payment_requested', 'paid'],
    index: true,
  },
  lineJobOfferId: { type: Schema.Types.ObjectId, ref: 'JobOffer', index: true },
  lineAcceptedAt: { type: Date },
  deliveredAt: { type: Date },
  deliveryDocumentVideoMessageId: { type: String },
  paymentRequestedAt: { type: Date },

  tonKm: { type: Number },
  emissionFactor: { type: Number },
  emissionKgCo2e: { type: Number },

  tgoVersion: { type: String },
  calculatedAt: { type: Date },
  settingSnapshotId: { type: Schema.Types.ObjectId, ref: 'Setting' },

  status: { type: String, enum: ['No POD', 'Pending', 'Verified'], default: 'No POD' },
  gpsSession: { type: GpsSessionSchema, default: () => ({ source: 'line_oa', status: 'inactive', isTracking: false }) },
  companyName: { type: String }, 
  customerName: { type: String },
  podImageUrl: { type: String }, 
  cargoType: { type: String, enum: ['ตู้', 'พื้นเรียบ', 'โลวเบท'], default: 'ตู้' },
  cargoName: { type: String },
  isPublic: { type: Boolean, default: false, index: true },
  originLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },

  // Billing and Payment fields
  paymentType: { type: String, enum: ['credit', 'cash'], default: 'cash', index: true },
  paymentStatus: { type: String, enum: ['unpaid', 'pending_verification', 'paid'], default: 'unpaid', index: true },
  billingDate: { type: Date },
  paymentDueDate: { type: Date },
  paymentSlipUrl: { type: String },
  paymentBatchId: { type: String, index: true },
  jobSheetReleased: { type: Boolean, default: false, index: true },
  paymentTransRef: { type: String, index: true },
  paymentTransTime: { type: Date }
}, { timestamps: true });

TripSchema.index({ originLocation: '2dsphere' });

TripSchema.index({ companyId: 1, createdAt: -1 });
TripSchema.index({ driverId: 1, createdAt: -1 });

export const Trip = mongoose.models.Trip || mongoose.model<ITrip>('Trip', TripSchema);
