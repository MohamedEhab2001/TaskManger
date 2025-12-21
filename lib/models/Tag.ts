import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITag extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  name: {
    en: string;
    ar: string;
  };
  color?: string;
  createdAt: Date;
}

const TagSchema = new Schema<ITag>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'TagGroup',
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
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

TagSchema.index({ userId: 1 });
TagSchema.index({ groupId: 1 });
TagSchema.index({ userId: 1, groupId: 1 });

export const Tag: Model<ITag> = mongoose.models.Tag || mongoose.model<ITag>('Tag', TagSchema);
