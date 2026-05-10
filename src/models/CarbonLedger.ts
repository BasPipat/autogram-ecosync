import mongoose, { Schema, Document } from 'mongoose';

export interface ICarbonLedger extends Document {
  tripId: string;
  emissionsKgCO2: number;
  calculationMethod: string;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CarbonLedgerSchema = new Schema<ICarbonLedger>({
  tripId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  emissionsKgCO2: { 
    type: Number, 
    required: true,
    min: 0 
  },
  calculationMethod: { 
    type: String, 
    default: 'TGO Standard' 
  },
  calculatedAt: { 
    type: Date, 
    default: Date.now 
  },
}, { 
  timestamps: true 
});

export const CarbonLedger = mongoose.models.CarbonLedger || mongoose.model<ICarbonLedger>('CarbonLedger', CarbonLedgerSchema);
