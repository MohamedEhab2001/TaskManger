import mongoose, { Schema, Document, Model } from 'mongoose';

export type TaskStatus = 'todo' | 'doing' | 'hold' | 'done' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ITaskTimeSession {
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
}

export interface ITaskTimeTracking {
  totalSeconds: number;
  isRunning: boolean;
  lastStartedAt: Date | null;
  sessions: ITaskTimeSession[];
}

export interface ITaskSubtask {
  _id: mongoose.Types.ObjectId;
  title: string;
  isDone: boolean;
  createdAt: Date;
  doneAt: Date | null;
}

export interface ITaskCompletionReflection {
  completionRate: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  autoSuggestionsAccepted?: boolean;
}

export interface ITaskDoneTransitionMeta {
  lastStatus: TaskStatus;
  doneAt: Date | null;
  doneTriggeredReflectionAt: Date | null;
}

export type TaskAccuracyCategory = 'underestimated' | 'overestimated' | 'accurate';

export interface ITaskEstimationResult {
  estimatedMinutes: number;
  actualMinutes: number;
  deltaMinutes: number;
  deltaPercent: number;
  accuracyCategory: TaskAccuracyCategory;
  accuracyScore: number;
  thresholdPct: number;
  computedAt: Date;
}

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  startAt?: Date;
  completedAt?: Date | null;
  tags: mongoose.Types.ObjectId[];
  estimatedMinutes?: number;
  actualMinutes?: number;
  estimationResult?: ITaskEstimationResult | null;
  timeTracking?: ITaskTimeTracking;
  subtasks?: ITaskSubtask[];
  completionReflection?: ITaskCompletionReflection | null;
  doneTransitionMeta?: ITaskDoneTransitionMeta | null;
  originalTaskId?: mongoose.Types.ObjectId | null;
  isPinned: boolean;
  reopenCount: number;
  priorityChangeCount: number;
  lastStatusChangedAt?: Date | null;
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
      enum: ['todo', 'doing', 'hold', 'done', 'archived'],
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
    estimationResult: {
      estimatedMinutes: { type: Number, default: null },
      actualMinutes: { type: Number, default: null },
      deltaMinutes: { type: Number, default: null },
      deltaPercent: { type: Number, default: null },
      accuracyCategory: { type: String, enum: ['underestimated', 'overestimated', 'accurate'], default: null },
      accuracyScore: { type: Number, default: null },
      thresholdPct: { type: Number, default: null },
      computedAt: { type: Date, default: null },
    },
    timeTracking: {
      totalSeconds: {
        type: Number,
        default: 0,
      },
      isRunning: {
        type: Boolean,
        default: false,
      },
      lastStartedAt: {
        type: Date,
        default: null,
      },
      sessions: {
        type: [
          {
            startedAt: { type: Date, required: true },
            endedAt: { type: Date, required: true },
            durationSeconds: { type: Number, required: true },
          },
        ],
        default: [],
      },
    },
    subtasks: {
      type: [
        {
          title: { type: String, required: true, trim: true },
          isDone: { type: Boolean, default: false },
          createdAt: { type: Date, default: Date.now },
          doneAt: { type: Date, default: null },
        },
      ],
      default: undefined,
    },
    completionReflection: {
      completionRate: { type: Number, default: null },
      notes: { type: String, default: '' },
      createdAt: { type: Date, default: null },
      updatedAt: { type: Date, default: null },
      autoSuggestionsAccepted: { type: Boolean, default: null },
    },
    doneTransitionMeta: {
      lastStatus: { type: String, enum: ['todo', 'doing', 'hold', 'done', 'archived'], default: null },
      doneAt: { type: Date, default: null },
      doneTriggeredReflectionAt: { type: Date, default: null },
    },
    originalTaskId: {
      type: Schema.Types.ObjectId,
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
    lastStatusChangedAt: {
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
TaskSchema.index({ userId: 1, completedAt: 1 });
TaskSchema.index({ userId: 1, dueDate: 1 });
TaskSchema.index({ userId: 1, tags: 1 });
TaskSchema.index({ userId: 1, lastStatusChangedAt: 1 });
TaskSchema.index({ userId: 1, createdAt: -1 });
TaskSchema.index({ userId: 1, isPinned: -1, createdAt: -1 });

export const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
