/**
 * Quotation multi-currency calculation engine for line items, taxes, discounts, exchange rates, and precision round off.
 */
import { getCurrencyConfig } from '../constants/currencies.js';

/**
 * Robust decimal rounder to avoid JavaScript floating point errors (e.g. 1.005 -> 1.01)
 * @param {number} value 
 * @param {number} decimals 
 * @returns {number}
 */
export function roundToPrecision(value, decimals = 2) {
  const num = Number(value) || 0;
  if (decimals === 0) return Math.round(num);
  return Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
}

/**
 * Calculates individual line item financials with currency decimal precision
 * @param {object} item 
 * @param {string} currencyCode
 * @returns {object} Calculated item breakdown
 */
export function calculateItemTotals(item = {}, currencyCode = 'INR') {
  const config = getCurrencyConfig(currencyCode);
  const decimals = config.decimals;

  const qty = Math.max(0, parseFloat(item.quantity) || 0);
  const rate = Math.max(0, parseFloat(item.rate) || 0); // Supply Rate
  const laborRate = Math.max(0, parseFloat(item.laborRate) || 0);

  // Total labor per line item: Quantity * Labor Rate (Per unit labor)
  const laborTotal = roundToPrecision(qty * laborRate, decimals);
  // Total material / supply per line item: Quantity * Supply Rate
  const materialTotal = roundToPrecision(qty * rate, decimals);
  
  // Unit rate including both supply and labor
  const effectiveRate = roundToPrecision(rate + laborRate, decimals);

  const discountPercent = Math.max(0, Math.min(100, parseFloat(item.discountPercent) || 0));
  const gstRate = Math.max(0, parseFloat(item.gstRate) || 0);

  // Gross line amount = Supply Total + Labor Total
  const rawAmount = roundToPrecision(materialTotal + laborTotal, decimals);
  const discountAmount = roundToPrecision((rawAmount * discountPercent) / 100, decimals);
  const taxableAmount = Math.max(0, roundToPrecision(rawAmount - discountAmount, decimals));
  const taxAmount = roundToPrecision((taxableAmount * gstRate) / 100, decimals);
  const totalAmount = roundToPrecision(taxableAmount + taxAmount, decimals);

  return {
    quantity: qty,
    rate: rate,
    supplyRate: rate,
    laborRate: laborRate,
    laborTotal: laborTotal,
    materialTotal: materialTotal,
    supplyTotal: materialTotal,
    effectiveRate: effectiveRate,
    discountPercent: discountPercent,
    gstRate: gstRate,
    amount: rawAmount,
    discountAmount: discountAmount,
    taxableAmount: taxableAmount,
    taxAmount: taxAmount,
    totalAmount: totalAmount
  };
}

/**
 * Calculates complete quotation financial breakdown across supported currencies and tax treatments
 * @param {object} params
 * @param {Array} params.items - Array of item objects
 * @param {number} [params.overallDiscountPercent=0] - Overall Trade Discount % on Gross Subtotal
 * @param {string} params.companyState - State where company is registered (default Gujarat)
 * @param {string} params.customerState - State where customer is located
 * @param {string} [params.currencyCode='INR'] - Standard ISO 4217 code
 * @param {number} [params.exchangeRate=1] - Quote Currency to Base INR (e.g., 86.50 INR per USD)
 * @param {string} [params.taxTreatment='DOMESTIC_REGULAR'] - 'DOMESTIC_REGULAR' | 'EXPORT_ZERO_RATED' | 'EXPORT_WITH_TAX' | 'EXEMPT'
 * @returns {object} Quotation totals breakdown
 */
export function calculateQuotationTotals({
  items = [],
  overallDiscountPercent = 0,
  overallGstRate = null,
  companyState = 'Gujarat',
  customerState = '',
  currencyCode = 'INR',
  exchangeRate = 1,
  taxTreatment = 'DOMESTIC_REGULAR'
}) {
  const config = getCurrencyConfig(currencyCode);
  const decimals = config.decimals;
  const rateNum = Math.max(0.000001, parseFloat(exchangeRate) || config.defaultExchangeRate || 1);

  let materialTotal = 0;
  let laborTotal = 0;
  let grossSubtotal = 0;

  const normTaxTreatment = String(taxTreatment || '').toUpperCase();
  const isZeroTax = normTaxTreatment.includes('LUT') || normTaxTreatment === 'EXPORT_ZERO_RATED' || normTaxTreatment === 'EXEMPT';

  // Step 1: Calculate raw line amounts (Supply + Labor)
  const preCalculatedItems = items.map((item, index) => {
    const itemCalc = calculateItemTotals(item, currencyCode);
    materialTotal += itemCalc.materialTotal;
    laborTotal += itemCalc.laborTotal;
    grossSubtotal += itemCalc.amount;

    return {
      ...item,
      ...itemCalc,
      itemIndex: index + 1
    };
  });

  materialTotal = roundToPrecision(materialTotal, decimals);
  laborTotal = roundToPrecision(laborTotal, decimals);
  grossSubtotal = roundToPrecision(grossSubtotal, decimals);

  // Step 2: Overall Discount applied to Gross Subtotal
  const discPercent = Math.max(0, Math.min(100, parseFloat(overallDiscountPercent) || 0));
  const totalDiscount = roundToPrecision((grossSubtotal * discPercent) / 100, decimals);
  const totalTaxable = Math.max(0, roundToPrecision(grossSubtotal - totalDiscount, decimals));

  // Step 3: Compute GST - if overallGstRate is specified, use that overall rate, else per-item rate
  let totalTax = 0;
  const discountFactor = grossSubtotal > 0 ? (totalTaxable / grossSubtotal) : 1;
  const hasOverallGst = overallGstRate !== null && overallGstRate !== undefined && overallGstRate !== '';
  const parsedOverallGst = hasOverallGst ? parseFloat(overallGstRate) || 0 : null;

  const calculatedItems = preCalculatedItems.map((item) => {
    const effectiveGst = isZeroTax ? 0 : (hasOverallGst ? parsedOverallGst : (parseFloat(item.gstRate) || 0));
    // Proportionate taxable value for this line item after overall discount
    const lineTaxable = roundToPrecision(item.amount * discountFactor, decimals);
    const lineTax = roundToPrecision((lineTaxable * effectiveGst) / 100, decimals);
    const lineTotal = roundToPrecision(lineTaxable + lineTax, decimals);

    totalTax += lineTax;

    return {
      ...item,
      gstRate: effectiveGst,
      taxableAmount: lineTaxable,
      taxAmount: lineTax,
      totalAmount: lineTotal
    };
  });

  totalTax = roundToPrecision(totalTax, decimals);
  laborTotal = roundToPrecision(laborTotal, decimals);
  const subtotal = grossSubtotal;

  // State Tax Rule: Compare company state vs customer state
  const cleanCompState = (companyState || '').trim().toLowerCase();
  const cleanCustState = (customerState || '').trim().toLowerCase();
  
  let isInterState = false;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isZeroTax) {
    // Export under LUT/Bond: Zero Tax
    isInterState = true;
    cgstAmount = 0;
    sgstAmount = 0;
    igstAmount = 0;
  } else if (normTaxTreatment === 'EXPORT_WITH_TAX' || normTaxTreatment.includes('WITH_TAX') || normTaxTreatment.includes('WITH_IGST')) {
    // Export with IGST payment
    isInterState = true;
    igstAmount = totalTax;
  } else {
    // DOMESTIC_REGULAR
    isInterState = cleanCompState !== '' && cleanCustState !== '' && cleanCompState !== cleanCustState;
    if (isInterState) {
      igstAmount = totalTax;
    } else {
      const halfTax = roundToPrecision(totalTax / 2, decimals);
      cgstAmount = halfTax;
      sgstAmount = roundToPrecision(totalTax - halfTax, decimals);
    }
  }

  const rawGrandTotal = totalTaxable + totalTax;
  // If JPY or 0 decimals, round to nearest integer. Otherwise keep standard precision or round off if desired.
  let roundedGrandTotal = rawGrandTotal;
  let roundOff = 0;

  if (decimals === 0) {
    roundedGrandTotal = Math.round(rawGrandTotal);
    roundOff = roundToPrecision(roundedGrandTotal - rawGrandTotal, 2);
  } else {
    // For INR, convention rounds off to nearest integer
    if (config.code === 'INR') {
      roundedGrandTotal = Math.round(rawGrandTotal);
      roundOff = roundToPrecision(roundedGrandTotal - rawGrandTotal, 2);
    } else {
      roundedGrandTotal = roundToPrecision(rawGrandTotal, decimals);
      roundOff = 0;
    }
  }

  // Base Currency (INR) Equivalent Reporting
  const reportingGrandTotalINR = roundToPrecision(
    config.code === 'INR' ? roundedGrandTotal : roundedGrandTotal * rateNum,
    2
  );
  const reportingTaxableINR = roundToPrecision(
    config.code === 'INR' ? totalTaxable : totalTaxable * rateNum,
    2
  );

  return {
    items: calculatedItems,
    itemCount: items.length,
    currency: config,
    currencyCode: config.code,
    currencySymbol: config.symbol,
    exchangeRate: rateNum,
    taxTreatment,
    materialTotal,
    laborTotal,
    subtotal,
    totalDiscount,
    totalTaxable,
    totalTax,
    isInterState,
    cgstAmount,
    sgstAmount,
    igstAmount,
    roundOff,
    grandTotal: roundedGrandTotal,
    reporting: {
      baseCurrency: 'INR',
      exchangeRate: rateNum,
      taxableAmountINR: reportingTaxableINR,
      grandTotalINR: reportingGrandTotalINR
    }
  };
}

/**
 * Universal Currency Formatter
 * @param {number} value 
 * @param {boolean} [showSymbol=true] 
 * @param {string} [currencyCode='INR'] 
 * @returns {string} E.g. "₹ 1,50,000.00", "$ 1,500.00", "¥ 150,000"
 */
export function formatCurrency(value = 0, showSymbol = true, currencyCode = 'INR') {
  const num = Number(value) || 0;
  const config = getCurrencyConfig(currencyCode);
  
  const formatted = num.toLocaleString(config.locale || 'en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals
  });

  return showSymbol ? `${config.symbol}${formatted}` : formatted;
}

/**
 * Formats a date string (YYYY-MM-DD) to Indian standard DD-MM-YYYY format (e.g. 30-08-2026).
 * @param {string} dateStr 
 * @returns {string}
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return '-';
  if (dateStr.includes('/') || (dateStr.includes('-') && dateStr.split('-')[0].length <= 2)) {
    return dateStr;
  }
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }
  return dateStr;
}
