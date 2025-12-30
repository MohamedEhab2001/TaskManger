import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorkspaceVariable extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  key: string;
  value: string;
  tag?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceVariableSchema = new Schema<IWorkspaceVariable>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
    },
    tag: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

WorkspaceVariableSchema.index({ userId: 1, key: 1 }, { unique: true });
WorkspaceVariableSchema.index({ userId: 1, createdAt: -1 });

export const WorkspaceVariable: Model<IWorkspaceVariable> =
  mongoose.models.WorkspaceVariable ||
  mongoose.model<IWorkspaceVariable>('WorkspaceVariable', WorkspaceVariableSchema);
