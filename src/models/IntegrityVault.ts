import mongoose, { Schema, Document } from 'mongoose';

export interface IIntegrityVault extends Document {
  tripId: string;
  podImageUrl: string;
  isVerified: boolean;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrityVaultSchema = new Schema<IIntegrityVault>({
  tripId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  podImageUrl: { 
    type: String, 
    required: true,
    validate: {
      validator: (v: string) => {
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid URL format for podImageUrl'
    }
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  verifiedAt: { 
    type: Date 
  },
}, { 
  timestamps: true 
});

export const IntegrityVault = mongoose.models.IntegrityVault || mongoose.model<IIntegrityVault>('IntegrityVault', IntegrityVaultSchema);
