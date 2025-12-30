import mongoose, { Schema, Document, Model } from 'mongoose';

export type ClientShareLanguage = 'en' | 'ar';

export interface IClientShare extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tagId: mongoose.Types.ObjectId;
  token: string;
  title: string;
  isActive: boolean;
  defaultLanguage: ClientShareLanguage;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ClientShareSchema = new Schema<IClientShare>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tagId: {
      type: Schema.Types.ObjectId,
      ref: 'Tag',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    defaultLanguage: {
      type: String,
      enum: ['en', 'ar'],
      default: 'en',
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ClientShareSchema.index({ userId: 1, tagId: 1 });
ClientShareSchema.index({ userId: 1, isActive: 1 });

export const ClientShare: Model<IClientShare> =
  mongoose.models.ClientShare || mongoose.model<IClientShare>('ClientShare', ClientShareSchema);
