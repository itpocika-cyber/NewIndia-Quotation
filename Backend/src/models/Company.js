import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: 'POCIKA FIRE AND SAFETY PRODUCTS LLP',
      trim: true
    },
    llpin: {
      type: String,
      default: 'ABA-3518',
      trim: true
    },
    logoUrl: {
      type: String,
      default: '/logo.png'
    },
    address: {
      type: String,
      default: '1st Floor, Plot - M, RJD Textile Park, Ichchhapore, Chorasi'
    },
    city: {
      type: String,
      default: 'Surat'
    },
    state: {
      type: String,
      default: 'Gujarat'
    },
    country: {
      type: String,
      default: 'India'
    },
    pincode: {
      type: String,
      default: '394510'
    },
    phone: {
      type: String,
      default: '+91 70965 64828'
    },
    altPhone: {
      type: String,
      default: '+91 84605 64828'
    },
    email: {
      type: String,
      default: 'sales@pocikafireandsafety.com'
    },
    website: {
      type: String,
      default: 'www.pocikafireandsafety.com'
    },
    gstin: {
      type: String,
      default: '24ABAFP3518F1Z4'
    },
    pan: {
      type: String,
      default: 'ABAFP3518F'
    },
    bankName: {
      type: String,
      default: 'HDFC Bank Ltd.'
    },
    accountNo: {
      type: String,
      default: '50200084605648'
    },
    ifsc: {
      type: String,
      default: 'HDFC0000256'
    },
    branch: {
      type: String,
      default: 'Ring Road, Surat, Gujarat'
    },
    upiId: {
      type: String,
      default: 'pocikafire@hdfcbank'
    },
    signatoryName: {
      type: String,
      default: ''
    },
    signatoryTitle: {
      type: String,
      default: 'Authorized Signatory'
    },
    signatureUrl: {
      type: String,
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

export const Company = mongoose.model('Company', companySchema);
