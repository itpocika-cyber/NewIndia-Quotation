import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Quotation } from '../models/Quotation.js';

dotenv.config();

async function fixQuotationTotals() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB. Scanning quotations...');

  const quotations = await Quotation.find();
  console.log(`Found ${quotations.length} quotations.`);

  let updatedCount = 0;
  for (const q of quotations) {
    console.log(`Checking Quotation: ${q.quotationNo}`);
    console.log('Current totals:', JSON.stringify(q.totals));
    console.log('Current financials:', JSON.stringify(q.financials));
    console.log('Items count:', q.items?.length);

    let needsUpdate = false;
    let grandTotal = Number(q.totals?.grandTotal || q.financials?.grandTotal || 0);

    // Calculate totals from items if items exist
    if (Array.isArray(q.items) && q.items.length > 0) {
      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;

      for (const item of q.items) {
        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const discPercent = parseFloat(item.discountPercent) || 0;
        const lineSub = qty * rate;
        const lineDisc = (lineSub * discPercent) / 100;
        const taxable = lineSub - lineDisc;
        const tax = parseFloat(item.taxAmount) || (taxable * (parseFloat(item.gstRate) || 18) / 100);

        subtotal += lineSub;
        totalDiscount += lineDisc;
        totalTax += tax;
      }

      const totalTaxable = subtotal - totalDiscount;
      const rawGrand = totalTaxable + totalTax;
      const roundedGrand = Math.round(rawGrand);
      const roundOff = parseFloat((roundedGrand - rawGrand).toFixed(2));

      q.totals = {
        subtotal: parseFloat(subtotal.toFixed(2)),
        totalDiscount: parseFloat(totalDiscount.toFixed(2)),
        totalTaxable: parseFloat(totalTaxable.toFixed(2)),
        taxableAmount: parseFloat(totalTaxable.toFixed(2)),
        isInterState: false,
        cgstAmount: parseFloat((totalTax / 2).toFixed(2)),
        sgstAmount: parseFloat((totalTax / 2).toFixed(2)),
        igstAmount: 0,
        totalTax: parseFloat(totalTax.toFixed(2)),
        roundOff: roundOff,
        grandTotal: roundedGrand,
        amountInWords: ''
      };
      q.financials = { ...q.totals };
      needsUpdate = true;
    }

    if (needsUpdate) {
      await Quotation.updateOne(
        { _id: q._id },
        { 
          $set: { 
            totals: q.totals,
            financials: q.financials
          } 
        }
      );
      console.log(`Updated ${q.quotationNo} with grandTotal: ${q.totals.grandTotal}`);
      updatedCount++;
    }
  }

  console.log(`Total quotations updated: ${updatedCount}`);
  await mongoose.disconnect();
}

fixQuotationTotals().catch(err => {
  console.error('Error running fixQuotationTotals:', err);
  process.exit(1);
});
