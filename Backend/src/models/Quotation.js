import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    productId: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    name: { type: String, required: true },
    make: { type: String, default: 'POCIKA' },
    description: { type: String, default: '' },
    hsnCode: { type: String, default: '' },
    quantity: { type: Number, required: true, default: 1 },
    unit: { type: String, default: 'Nos' },
    rate: { type: Number, required: true, default: 0 },
    laborCount: { type: Number, default: 0 },
    laborRate: { type: Number, default: 0 },
    laborTotal: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    gstRate: { type: Number, default: 18 },
    cgstRate: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstRate: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstRate: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 }
  },
  { _id: false }
);

const customerSnapshotSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    name: { type: String, default: '' },
    contactPerson: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: 'Gujarat' },
    gstin: { type: String, default: '' },
    pan: { type: String, default: '' },
    billingAddress: { type: String, default: '' },
    shippingAddress: { type: String, default: '' },
    shippingCity: { type: String, default: '' },
    shippingState: { type: String, default: '' },
    shippingPincode: { type: String, default: '' },
    shippingContactPerson: { type: String, default: '' },
    shippingPhone: { type: String, default: '' }
  },
  { _id: false }
);

const currencyDetailsSchema = new mongoose.Schema(
  {
    code: { type: String, default: 'INR', uppercase: true, trim: true },
    symbol: { type: String, default: '₹' },
    decimals: { type: Number, default: 2 },
    exchangeRate: { type: Number, default: 1 },
    baseCurrency: { type: String, default: 'INR' },
    rateDate: { type: String, default: '' },
    rateSource: { type: String, default: 'Manual' }
  },
  { _id: false }
);

const taxTreatmentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['DOMESTIC_REGULAR', 'EXPORT_ZERO_RATED', 'EXPORT_WITH_TAX', 'EXEMPT'],
      default: 'DOMESTIC_REGULAR'
    },
    lutNumber: { type: String, default: '' },
    note: { type: String, default: '' }
  },
  { _id: false }
);

const quotationTotalsSchema = new mongoose.Schema(
  {
    materialTotal: { type: Number, default: 0 },
    laborTotal: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    overallDiscountPercent: { type: Number, default: 0 },
    overallGstRate: { type: String, default: '18' },
    totalDiscount: { type: Number, default: 0 },
    totalTaxable: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    isInterState: { type: Boolean, default: false },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    amountInWords: { type: String, default: '' },
    currencyCode: { type: String, default: 'INR' },
    currencySymbol: { type: String, default: '₹' },
    reporting: {
      baseCurrency: { type: String, default: 'INR' },
      exchangeRate: { type: Number, default: 1 },
      taxableAmountINR: { type: Number, default: 0 },
      grandTotalINR: { type: Number, default: 0 }
    }
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    quotationNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    baseQuotationNo: {
      type: String,
      default: '',
      index: true
    },
    version: {
      type: Number,
      default: 1
    },
    revisionLabel: {
      type: String,
      default: 'v1'
    },
    revisionHistory: [
      {
        version: { type: Number, default: 1 },
        revisionLabel: { type: String, default: 'v1' },
        quotationNo: { type: String, default: '' },
        date: { type: String, default: '' },
        items: { type: Array, default: [] },
        totals: { type: Object, default: {} },
        customer: { type: Object, default: {} },
        grandTotal: { type: Number, default: 0 },
        revisedBy: { type: String, default: '' },
        revisedAt: { type: Date, default: Date.now },
        notes: { type: String, default: '' }
      }
    ],
    currency: {
      type: currencyDetailsSchema,
      default: () => ({
        code: 'INR',
        symbol: '₹',
        decimals: 2,
        exchangeRate: 1,
        baseCurrency: 'INR',
        rateDate: '',
        rateSource: 'Manual'
      })
    },
    taxTreatment: {
      type: taxTreatmentSchema,
      default: () => ({
        type: 'DOMESTIC_REGULAR',
        lutNumber: '',
        note: ''
      })
    },
    quotationDate: {
      type: String,
      required: true
    },
    validUntilDate: {
      type: String,
      default: ''
    },
    referenceNo: {
      type: String,
      default: '',
      index: true
    },
    orderNo: {
      type: String,
      default: 'Verbal Order'
    },
    orderType: {
      type: String,
      enum: ['Verbal Order', 'Email Approval', 'Purchase Order (PO)', 'Work Order (WO)', 'Letter of Intent (LOI)', 'Other'],
      default: 'Verbal Order'
    },
    poNumber: {
      type: String,
      default: ''
    },
    approvedBy: {
      type: String,
      default: ''
    },
    approvedAt: {
      type: Date,
      default: null
    },
    approvalNote: {
      type: String,
      default: ''
    },
    dispatchDetails: {
      paymentTerms: { type: String, default: '' },
      freightTerms: { type: String, default: '' },
      freightType: { type: String, default: '' },
      grTerm: { type: String, default: '' },
      transportName: { type: String, default: '' }
    },
    subject: {
      type: String,
      default: ''
    },
    salesPerson: {
      type: String,
      default: ''
    },
    preparedBy: {
      type: String,
      default: ''
    },
    createdByName: {
      type: String,
      default: ''
    },
    createdByEmail: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Pending', 'Accepted', 'Approved', 'Rejected', 'Expired', 'Cancelled'],
      default: 'Draft',
      index: true
    },
    customer: {
      type: customerSnapshotSchema,
      default: () => ({})
    },
    items: {
      type: [lineItemSchema],
      default: []
    },
    totals: {
      type: quotationTotalsSchema,
      default: () => ({})
    },
    financials: {
      type: quotationTotalsSchema,
      default: () => ({})
    },
    paymentTermsId: {
      type: String,
      default: ''
    },
    paymentTermsNote: {
      type: String,
      default: ''
    },
    selectedTermIds: {
      type: [String],
      default: []
    },
    selectedTerms: {
      type: mongoose.Schema.Types.Mixed,
      default: []
    },
    companySnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    notes: {
      type: String,
      default: ''
    },
    savedAt: {
      type: Date,
      default: Date.now
    },
    overallDiscountPercent: {
      type: Number,
      default: 0
    },
    overallGstRate: {
      type: String,
      default: '18'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        if (!ret.currency) {
          ret.currency = {
            code: 'INR',
            symbol: '₹',
            decimals: 2,
            exchangeRate: 1,
            baseCurrency: 'INR'
          };
        }
        if (!ret.totals || !ret.totals.grandTotal) {
          ret.totals = ret.totals || ret.financials || {};
          if ((!ret.totals.grandTotal || ret.totals.grandTotal === 0) && Array.isArray(ret.items) && ret.items.length > 0) {
            const currCode = ret.currency?.code || 'INR';
            const decimals = ret.currency?.decimals ?? (currCode === 'JPY' ? 0 : 2);
            const sub = ret.items.reduce((s, i) => s + ((parseFloat(i.quantity) || 0) * (parseFloat(i.rate) || 0)), 0);
            const disc = ret.items.reduce((s, i) => {
              const raw = (parseFloat(i.quantity) || 0) * (parseFloat(i.rate) || 0);
              return s + (raw * (parseFloat(i.discountPercent) || 0)) / 100;
            }, 0);
            const taxable = sub - disc;
            const tax = ret.items.reduce((s, i) => s + (parseFloat(i.taxAmount) || 0), 0);
            const grand = decimals === 0 ? Math.round(taxable + tax) : Number((taxable + tax).toFixed(decimals));
            ret.totals = {
              subtotal: Number(sub.toFixed(decimals)),
              totalDiscount: Number(disc.toFixed(decimals)),
              totalTaxable: Number(taxable.toFixed(decimals)),
              taxableAmount: Number(taxable.toFixed(decimals)),
              totalTax: Number(tax.toFixed(decimals)),
              grandTotal: grand,
              roundOff: 0,
              currencyCode: currCode,
              currencySymbol: ret.currency?.symbol || '₹'
            };
          }
        }
        return ret;
      }
    }
  }
);

// Pre-save hook: ensure totals and financials are synced and populated
quotationSchema.pre('save', function (next) {
  if (!this.currency || !this.currency.code) {
    this.currency = {
      code: 'INR',
      symbol: '₹',
      decimals: 2,
      exchangeRate: 1,
      baseCurrency: 'INR',
      rateDate: '',
      rateSource: 'Manual'
    };
  }

  if (this.totals && (!this.financials || Object.keys(this.financials).length === 0)) {
    this.financials = { ...this.totals.toObject?.() || this.totals };
  } else if (this.financials && (!this.totals || Object.keys(this.totals).length === 0)) {
    this.totals = { ...this.financials.toObject?.() || this.financials };
  }

  // Recalculate if grandTotal is 0 but items are present
  if ((!this.totals?.grandTotal || this.totals.grandTotal === 0) && Array.isArray(this.items) && this.items.length > 0) {
    const currCode = this.currency?.code || 'INR';
    const decimals = this.currency?.decimals ?? (currCode === 'JPY' ? 0 : 2);
    const sub = this.items.reduce((s, i) => s + ((parseFloat(i.quantity) || 0) * (parseFloat(i.rate) || 0)), 0);
    const disc = this.items.reduce((s, i) => {
      const raw = (parseFloat(i.quantity) || 0) * (parseFloat(i.rate) || 0);
      return s + (raw * (parseFloat(i.discountPercent) || 0)) / 100;
    }, 0);
    const taxable = sub - disc;
    const tax = this.items.reduce((s, i) => s + (parseFloat(i.taxAmount) || 0), 0);
    const grand = decimals === 0 ? Math.round(taxable + tax) : Number((taxable + tax).toFixed(decimals));
    this.totals = {
      subtotal: Number(sub.toFixed(decimals)),
      totalDiscount: Number(disc.toFixed(decimals)),
      totalTaxable: Number(taxable.toFixed(decimals)),
      taxableAmount: Number(taxable.toFixed(decimals)),
      totalTax: Number(tax.toFixed(decimals)),
      grandTotal: grand,
      roundOff: 0,
      currencyCode: currCode,
      currencySymbol: this.currency?.symbol || '₹'
    };
    this.financials = { ...this.totals };
  }
  next();
});

export const Quotation = mongoose.model('Quotation', quotationSchema);
