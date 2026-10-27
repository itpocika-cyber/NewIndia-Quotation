/**
 * Backend Calculation Engine (Mirroring Frontend calculation engine for 100% parity)
 */
import { getCurrencyConfig } from '../constants/currencies.js';

export function roundToPrecision(value, decimals = 2) {
  const num = Number(value) || 0;
  if (decimals === 0) return Math.round(num);
  return Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
}

export function calculateItemTotals(item = {}, currencyCode = 'INR') {
  const config = getCurrencyConfig(currencyCode);
  const decimals = config.decimals;

  const qty = Math.max(0, parseFloat(item.quantity) || 0);
  const rate = Math.max(0, parseFloat(item.rate) || 0);
  const laborRate = Math.max(0, parseFloat(item.laborRate) || 0);
  const effectiveRate = rate + laborRate;
  const discountPercent = Math.max(0, Math.min(100, parseFloat(item.discountPercent) || 0));
  const gstRate = Math.max(0, parseFloat(item.gstRate) || 0);

  const rawAmount = roundToPrecision(qty * effectiveRate, decimals);
  const discountAmount = roundToPrecision((rawAmount * discountPercent) / 100, decimals);
  const taxableAmount = Math.max(0, roundToPrecision(rawAmount - discountAmount, decimals));
  const taxAmount = roundToPrecision((taxableAmount * gstRate) / 100, decimals);
  const totalAmount = roundToPrecision(taxableAmount + taxAmount, decimals);

  return {
    quantity: qty,
    rate: rate,
    laborRate: laborRate,
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

  // Step 1: Calculate raw line amounts (no per-item discount applied here — overall discount handles it)
  const preCalculatedItems = items.map((item, index) => {
    const qty = Math.max(0, parseFloat(item.quantity) || 0);
    const rate = Math.max(0, parseFloat(item.rate) || 0);
    const laborRate = Math.max(0, parseFloat(item.laborRate) || 0);
    const itemMatTotal = roundToPrecision(qty * rate, decimals);
    const itemLaborTotal = roundToPrecision(qty * laborRate, decimals);
    const rawAmount = roundToPrecision(itemMatTotal + itemLaborTotal, decimals);
    materialTotal += itemMatTotal;
    laborTotal += itemLaborTotal;
    grossSubtotal += rawAmount;
    return { ...item, rawAmount, itemMatTotal, itemLaborTotal, itemIndex: index + 1 };
  });

  materialTotal = roundToPrecision(materialTotal, decimals);
  laborTotal = roundToPrecision(laborTotal, decimals);
  grossSubtotal = roundToPrecision(grossSubtotal, decimals);

  // Step 2: Apply overall discount OR per-item discount
  const discPercent = Math.max(0, Math.min(100, parseFloat(overallDiscountPercent) || 0));
  const totalDiscount = discPercent > 0
    ? roundToPrecision((grossSubtotal * discPercent) / 100, decimals)
    : roundToPrecision(preCalculatedItems.reduce((acc, item) => {
        const lineDp = Math.max(0, Math.min(100, parseFloat(item.discountPercent) || 0));
        return acc + ((item.rawAmount * lineDp) / 100);
      }, 0), decimals);

  const totalTaxable = Math.max(0, roundToPrecision(grossSubtotal - totalDiscount, decimals));
  const discountFactor = grossSubtotal > 0 ? (totalTaxable / grossSubtotal) : 1;

  // Step 3: Compute GST per line proportionately
  const hasOverallGst = overallGstRate !== null && overallGstRate !== undefined && overallGstRate !== '';
  const parsedOverallGst = hasOverallGst ? (parseFloat(overallGstRate) || 0) : null;

  let totalTax = 0;

  const calculatedItems = preCalculatedItems.map((item) => {
    const effectiveGst = isZeroTax ? 0 : (hasOverallGst ? parsedOverallGst : (parseFloat(item.gstRate) || 0));
    const lineTaxable = roundToPrecision(item.rawAmount * discountFactor, decimals);
    const lineTax = roundToPrecision((lineTaxable * effectiveGst) / 100, decimals);
    const lineTotalAmt = roundToPrecision(lineTaxable + lineTax, decimals);
    const lineDiscountAmt = roundToPrecision(item.rawAmount - lineTaxable, decimals);
    totalTax += lineTax;
    return {
      ...item,
      amount: item.rawAmount,
      discountPercent: discPercent > 0 ? discPercent : (parseFloat(item.discountPercent) || 0),
      discountAmount: lineDiscountAmt,
      taxableAmount: lineTaxable,
      gstRate: effectiveGst,
      taxAmount: lineTax,
      totalAmount: lineTotalAmt,
      materialTotal: item.itemMatTotal,
      laborTotal: item.itemLaborTotal
    };
  });

  totalTax = roundToPrecision(totalTax, decimals);

  const cleanCompState = (companyState || '').trim().toLowerCase();
  const cleanCustState = (customerState || '').trim().toLowerCase();

  let isInterState = false;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isZeroTax) {
    isInterState = true;
    cgstAmount = 0;
    sgstAmount = 0;
    igstAmount = 0;
  } else if (normTaxTreatment === 'EXPORT_WITH_TAX' || normTaxTreatment.includes('WITH_TAX') || normTaxTreatment.includes('WITH_IGST')) {
    isInterState = true;
    igstAmount = totalTax;
  } else {
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
  let roundedGrandTotal = rawGrandTotal;
  let roundOff = 0;

  if (decimals === 0) {
    roundedGrandTotal = Math.round(rawGrandTotal);
    roundOff = roundToPrecision(roundedGrandTotal - rawGrandTotal, 2);
  } else {
    if (config.code === 'INR') {
      roundedGrandTotal = Math.round(rawGrandTotal);
      roundOff = roundToPrecision(roundedGrandTotal - rawGrandTotal, 2);
    } else {
      roundedGrandTotal = roundToPrecision(rawGrandTotal, decimals);
      roundOff = 0;
    }
  }

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
    subtotal: grossSubtotal,
    overallDiscountPercent: discPercent,
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

export function formatCurrency(value = 0, showSymbol = true, currencyCode = 'INR') {
  const num = Number(value) || 0;
  const config = getCurrencyConfig(currencyCode);
  
  const formatted = num.toLocaleString(config.locale || 'en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals
  });

  return showSymbol ? `${config.symbol}${formatted}` : formatted;
}
