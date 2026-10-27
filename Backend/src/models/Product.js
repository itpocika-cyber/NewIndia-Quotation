import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    make: {
      type: String,
      trim: true,
      default: 'POCIKA'
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: String,
      trim: true,
      default: 'Fire Protection Equipment'
    },
    unit: {
      type: String,
      trim: true,
      default: 'Nos'
    },
    rate: {
      type: Number,
      default: 0,
      min: [0, 'Rate cannot be negative']
    },
    gstRate: {
      type: Number,
      default: 18,
      min: [0, 'GST rate cannot be negative']
    },
    hsnCode: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    },
    imageUrl: {
      type: String,
      trim: true,
      default: ''
    },
    imagePublicId: {
      type: String,
      trim: true,
      default: ''
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

export const Product = mongoose.model('Product', productSchema);
