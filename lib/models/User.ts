import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: 'user' | 'admin';
  plan: 'free' | 'pro';
  subscriptionStatus: 'none' | 'active' | 'past_due' | 'canceled';
  subscriptionStartedAt?: Date;
  subscriptionEndsAt?: Date;
  lastLoginAt?: Date;
  isDisabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    plan: {
      type: String,
      enum: ['free', 'pro'],
      default: 'free',
    },
    subscriptionStatus: {
      type: String,
      enum: ['none', 'active', 'past_due', 'canceled'],
      default: 'none',
    },
    subscriptionStartedAt: {
      type: Date,
    },
    subscriptionEndsAt: {
      type: Date,
    },
    lastLoginAt: {
      type: Date,
    },
    isDisabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ plan: 1 });
UserSchema.index({ subscriptionStatus: 1 });
UserSchema.index({ createdAt: -1 });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
