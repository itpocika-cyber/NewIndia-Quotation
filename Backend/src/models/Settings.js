import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    quotationPrefix: {
      type: String,
      default: 'QT',
      trim: true
    },
    quotationStartNumber: {
      type: Number,
      default: 1
    },
    quotationYearFormat: {
      type: String,
      enum: ['YYYY', 'YY', 'NONE'],
      default: 'YYYY'
    },
    defaultValidityDays: {
      type: Number,
      default: 30
    },
    currencySymbol: {
      type: String,
      default: '₹'
    },
    decimalPrecision: {
      type: Number,
      default: 2
    },
    showBankDetailsOnPDF: {
      type: Boolean,
      default: true
    },
    showSignatureOnPDF: {
      type: Boolean,
      default: true
    },
    customFooterText: {
      type: String,
      default: 'Thank you for your business! | This is a Computer Generated Quotation | Regd. Office: Surat, Gujarat | Subject to Surat Jurisdiction.'
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

export const Settings = mongoose.model('Settings', settingsSchema);
