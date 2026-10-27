import mongoose from 'mongoose';

const sequenceSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

/**
 * Atomically increment sequence counter and return formatted ID
 * e.g. getNext('customer', 'CUS-', 4) -> 'CUS-0001'
 */
sequenceSchema.statics.getNext = async function (key, prefix = '', digits = 4) {
  const result = await this.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const formatted = String(result.seq).padStart(digits, '0');
  return `${prefix}${formatted}`;
};

/**
 * Preview next sequence without incrementing.
 * For 'quotation', checks MongoDB collection so sequence never skips or inflates beyond actual saved quotations.
 */
sequenceSchema.statics.peekNext = async function (key, prefix = '', digits = 4) {
  let currentCount = 0;
  if (key === 'quotation' && mongoose.models.Quotation) {
    const quotes = await mongoose.models.Quotation.find({}, { quotationNo: 1 });
    let maxNum = 0;
    for (const q of quotes) {
      if (q.quotationNo) {
        const m = q.quotationNo.match(/(\d{4})$/);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    const doc = await this.findOne({ key });
    currentCount = Math.max(doc ? doc.seq : 0, maxNum);
    // Auto-calibrate if needed
    if (!doc || doc.seq !== currentCount) {
      await this.findOneAndUpdate(
        { key },
        { $set: { seq: currentCount } },
        { upsert: true }
      );
    }
  } else {
    const doc = await this.findOne({ key });
    currentCount = doc ? doc.seq : 0;
  }
  const nextNum = currentCount + 1;
  const formatted = String(nextNum).padStart(digits, '0');
  return `${prefix}${formatted}`;
};

/**
 * Set sequence count directly (useful during seed/import)
 */
sequenceSchema.statics.setCount = async function (key, count) {
  return this.findOneAndUpdate(
    { key },
    { $set: { seq: Math.max(0, count) } },
    { new: true, upsert: true }
  );
};

export const Sequence = mongoose.model('Sequence', sequenceSchema);
