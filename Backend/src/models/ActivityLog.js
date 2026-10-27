import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    quotationNo: {
      type: String,
      default: '',
      index: true
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    oldStatus: {
      type: String,
      default: ''
    },
    newStatus: {
      type: String,
      default: ''
    },
    note: {
      type: String,
      default: ''
    },
    user: {
      type: String,
      default: 'System'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
