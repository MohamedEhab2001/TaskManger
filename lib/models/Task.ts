import mongoose, { Schema, Document, Model } from 'mongoose';

export type TaskStatus = 'todo' | 'doing' | 'done' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  startAt?: Date;
  completedAt?: Date;
  tags: mongoose.Types.ObjectId[];
  estimatedMinutes?: number;
  actualMinutes?: number;
  isPinned: boolean;
  reopenCount: number;
  priorityChangeCount: number;
  lastStatusChangeAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['todo', 'doing', 'done', 'archived'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    startAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    tags: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Tag',
      },
    ],
    estimatedMinutes: {
      type: Number,
      default: null,
    },
    actualMinutes: {
      type: Number,
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    reopenCount: {
      type: Number,
      default: 0,
    },
    priorityChangeCount: {
      type: Number,
      default: 0,
    },
    lastStatusChangeAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

TaskSchema.index({ userId: 1 });
TaskSchema.index({ userId: 1, status: 1 });
TaskSchema.index({ userId: 1, dueDate: 1 });
TaskSchema.index({ userId: 1, tags: 1 });
TaskSchema.index({ userId: 1, createdAt: -1 });
TaskSchema.index({ userId: 1, isPinned: -1, createdAt: -1 });

export const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
