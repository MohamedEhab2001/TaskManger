import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITagGroup extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: {
    en: string;
    ar: string;
  };
  color: string;
  icon: string;
  createdAt: Date;
}

const TagGroupSchema = new Schema<ITagGroup>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      en: {
        type: String,
        required: true,
        trim: true,
      },
      ar: {
        type: String,
        required: true,
        trim: true,
      },
    },
    color: {
      type: String,
      required: true,
      default: '#6366f1',
    },
    icon: {
      type: String,
      required: true,
      default: 'tag',
    },
  },
  {
    timestamps: true,
  }
);

TagGroupSchema.index({ userId: 1 });
TagGroupSchema.index({ userId: 1, createdAt: -1 });

export const TagGroup: Model<ITagGroup> =
  mongoose.models.TagGroup || mongoose.model<ITagGroup>('TagGroup', TagGroupSchema);
