import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings extends Document {
  _id: mongoose.Types.ObjectId;
  key: string;
  value: any;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

SettingsSchema.index({ key: 1 });

export const Settings: Model<ISettings> = mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
