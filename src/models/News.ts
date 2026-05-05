import mongoose, { Schema, Document } from 'mongoose';

export interface INews extends Document {
  title: string;
  summary: string;
  content?: string;
  category: 'compliance' | 'esg' | 'logistics' | 'announcement';
  source: 'internal' | 'external';
  externalUrl?: string;
  imageUrl?: string;
  publishedAt: Date;
  publishedBy?: string;
  isActive: boolean;
}

const NewsSchema = new Schema<INews>({
  title: { type: String, required: true, trim: true },
  summary: { type: String, required: true, trim: true },
  content: { type: String },
  category: { type: String, enum: ['compliance', 'esg', 'logistics', 'announcement'], default: 'announcement' },
  source: { type: String, enum: ['internal', 'external'], default: 'internal' },
  externalUrl: { type: String },
  imageUrl: { type: String },
  publishedAt: { type: Date, default: Date.now },
  publishedBy: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

NewsSchema.index({ publishedAt: -1 });
NewsSchema.index({ category: 1, isActive: 1 });

export const News = mongoose.models.News || mongoose.model<INews>('News', NewsSchema);
