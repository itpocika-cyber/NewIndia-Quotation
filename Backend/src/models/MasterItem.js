import mongoose from 'mongoose';

const masterItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: ['category', 'unit', 'tax', 'payment_term', 'term_condition'],
      index: true
    },
    name: {
      type: String,
      trim: true,
      default: ''
    },
    title: {
      type: String,
      trim: true,
      default: ''
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    text: {
      type: String,
      trim: true,
      default: ''
    },
    symbol: {
      type: String,
      trim: true,
      default: ''
    },
    rate: {
      type: Number,
      default: 0
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    },
    order: {
      type: Number,
      default: 0
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

export const MasterItem = mongoose.model('MasterItem', masterItemSchema);
