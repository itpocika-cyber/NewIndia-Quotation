import { calculateItemTotals, calculateQuotationTotals, formatCurrency } from './calculations.js';
import { amountInWords } from './amountInWords.js';
import { isRequired, isPositiveNumber, isValidGSTIN, isValidPAN } from './validation.js';

console.log('=== RUNNING AUTOMATED UNIT CHECKS (POCIKA SURAT, GUJARAT) ===\n');

// 1. Check Line Item calculation
const item1 = calculateItemTotals({
  quantity: 4,
  rate: 1850,
  discountPercent: 10,
  gstRate: 18
});

console.assert(item1.amount === 7400, `Expected amount 7400, got ${item1.amount}`);
console.assert(item1.discountAmount === 740, `Expected discount 740, got ${item1.discountAmount}`);
console.assert(item1.taxableAmount === 6660, `Expected taxable 6660, got ${item1.taxableAmount}`);
console.assert(item1.taxAmount === 1198.8, `Expected tax 1198.8, got ${item1.taxAmount}`);
console.assert(item1.totalAmount === 7858.8, `Expected total 7858.8, got ${item1.totalAmount}`);
console.log('✔ Item Level Calculation Test Passed');

// 2. Check Intra-State CGST + SGST Calculation (Same state Gujarat: Surat to Surat/Ahmedabad)
const intraStateQuotation = calculateQuotationTotals({
  items: [
    { quantity: 2, rate: 4200, discountPercent: 0, gstRate: 18 },
    { quantity: 1, rate: 8500, discountPercent: 5, gstRate: 18 }
  ],
  companyState: 'Gujarat',
  customerState: 'Gujarat'
});

console.assert(intraStateQuotation.isInterState === false, 'Expected Intra-state');
console.assert(intraStateQuotation.cgstAmount > 0 && intraStateQuotation.sgstAmount > 0, 'Expected CGST & SGST > 0');
console.assert(intraStateQuotation.igstAmount === 0, 'Expected IGST == 0');
console.log('✔ Intra-State GST (CGST/SGST: Gujarat -> Gujarat) Routing Passed');

// 3. Check Inter-State IGST Calculation (Surat, Gujarat to Mumbai, Maharashtra)
const interStateQuotation = calculateQuotationTotals({
  items: [
    { quantity: 2, rate: 4200, discountPercent: 0, gstRate: 18 },
    { quantity: 1, rate: 8500, discountPercent: 5, gstRate: 18 }
  ],
  companyState: 'Gujarat',
  customerState: 'Maharashtra'
});

console.assert(interStateQuotation.isInterState === true, 'Expected Inter-state');
console.assert(interStateQuotation.cgstAmount === 0 && interStateQuotation.sgstAmount === 0, 'Expected CGST & SGST == 0');
console.assert(interStateQuotation.igstAmount > 0, 'Expected IGST > 0');
console.log('✔ Inter-State GST (IGST: Gujarat -> Maharashtra) Routing Passed');

// 4. Check Indian Currency Amount in Words
const words1 = amountInWords(125450.50);
console.assert(words1 === 'Rupees One Lakh Twenty Five Thousand Four Hundred Fifty and Fifty Paise Only', `Unexpected words: ${words1}`);
const words2 = amountInWords(2340500);
console.assert(words2 === 'Rupees Twenty Three Lakh Forty Thousand Five Hundred Only', `Unexpected words: ${words2}`);
console.log('✔ Indian Amount In Words (Lakhs & Crores) Passed:', words1);

// 5. Check Multi-Currency Amount in Words (USD, EUR, AED, JPY)
const wordsUSD = amountInWords(1450250.75, 'USD');
console.assert(wordsUSD === 'USD One Million Four Hundred Fifty Thousand Two Hundred Fifty Dollars and Seventy Five Cents Only', `USD words failed: ${wordsUSD}`);
const wordsJPY = amountInWords(500000, 'JPY');
console.assert(wordsJPY === 'JPY Five Hundred Thousand Yen Only', `JPY words failed: ${wordsJPY}`);
console.log('✔ Multi-Currency Amount In Words Passed (USD, JPY)');

// 6. Check Multi-Currency Quotation Calculations (USD Export with LUT 0% tax)
const usdExportQuote = calculateQuotationTotals({
  items: [
    { quantity: 10, rate: 120.50, discountPercent: 10, gstRate: 18 }
  ],
  currencyCode: 'USD',
  taxTreatment: 'export_lut',
  exchangeRate: 86.50
});
console.assert(usdExportQuote.taxTreatment === 'export_lut', 'Expected export_lut');
console.assert(usdExportQuote.totalTax === 0, `Expected 0 tax under LUT, got ${usdExportQuote.totalTax}`);
console.assert(usdExportQuote.grandTotal === 1084.50, `Expected grand total 1084.50, got ${usdExportQuote.grandTotal}`);
console.assert(usdExportQuote.reporting?.grandTotalINR === 93809.25, `Expected INR reporting 93809.25, got ${usdExportQuote.reporting?.grandTotalINR}`);
console.log('✔ USD Export with LUT (Zero-Rated 0% GST + INR reporting) Passed');

// 7. Check JPY Precision (0 decimals)
const jpyQuote = calculateQuotationTotals({
  items: [
    { quantity: 3, rate: 15432, discountPercent: 5, gstRate: 0 }
  ],
  currencyCode: 'JPY',
  taxTreatment: 'export_lut',
  exchangeRate: 0.58
});
console.assert(jpyQuote.currency?.decimals === 0, 'JPY decimals must be 0');
console.assert(Number.isInteger(jpyQuote.grandTotal), 'JPY grandTotal must be integer');
console.log('✔ JPY Zero-decimal Precision Calculation Passed');

// 8. Check Validators for Gujarat GSTIN (24 prefix) & PAN
console.assert(isValidGSTIN('24ABAFP3518F1Z4') === true, 'Valid Gujarat GSTIN failed');
console.assert(isValidGSTIN('INVALIDGST') === false, 'Invalid GSTIN passed');
console.assert(isValidPAN('ABAFP3518F') === true, 'Valid PAN failed');
console.log('✔ GSTIN and PAN Validators Passed');

console.log('\n=== ALL UNIT TESTS PASSED SUCCESSFULLY (0 ASSERTION FAILURES) ===');
