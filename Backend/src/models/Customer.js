import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
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
      required: [true, 'Customer name is required'],
      trim: true
    },
    siteName: {
      type: String,
      trim: true,
      default: '' // e.g. "Hazira Plant Expansion - Site 4" or "Powai Office"
    },
    contactPerson: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      default: ''
    },
    country: {
      type: String,
      trim: true,
      default: 'India'
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    state: {
      type: String,
      trim: true,
      default: 'Gujarat'
    },
    pincode: {
      type: String,
      trim: true,
      default: ''
    },
    taxId: {
      type: String,
      trim: true,
      default: ''
    },
    foreignRegNo: {
      type: String,
      trim: true,
      default: ''
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    billingAddress: {
      type: String,
      trim: true,
      default: ''
    },
    shippingAddress: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
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

export const Customer = mongoose.model('Customer', customerSchema);
