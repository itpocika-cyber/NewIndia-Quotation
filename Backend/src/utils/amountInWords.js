/**
 * Multi-Currency Amount in Words Engine (Backend Mirror)
 * Supports both Indian format (Rupees, Lakhs, Crores, Paise)
 * and International format (Millions, Billions, Dollars, Cents, Euros, Dirhams, Yen etc.)
 */
import { getCurrencyConfig } from '../constants/currencies.js';

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertTwoDigits(n) {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  return `${TENS[ten]}${unit > 0 ? ' ' + ONES[unit] : ''}`;
}

function convertThreeDigits(n) {
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  let result = '';

  if (hundred > 0) {
    result += `${ONES[hundred]} Hundred`;
    if (remainder > 0) result += ' ';
  }

  if (remainder > 0) {
    result += convertTwoDigits(remainder);
  }

  return result;
}

function convertIndianNumber(num) {
  if (num === 0) return 'Zero';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = num;

  const parts = [];
  if (crore > 0) parts.push(`${convertTwoDigits(crore)} Crore`);
  if (lakh > 0) parts.push(`${convertTwoDigits(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${convertTwoDigits(thousand)} Thousand`);
  if (remainder > 0) parts.push(convertThreeDigits(remainder));

  return parts.join(' ').trim();
}

function convertInternationalNumber(num) {
  if (num === 0) return 'Zero';

  const billion = Math.floor(num / 1000000000);
  num %= 1000000000;
  const million = Math.floor(num / 1000000);
  num %= 1000000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = num;

  const parts = [];
  if (billion > 0) parts.push(`${convertThreeDigits(billion)} Billion`);
  if (million > 0) parts.push(`${convertThreeDigits(million)} Million`);
  if (thousand > 0) parts.push(`${convertThreeDigits(thousand)} Thousand`);
  if (remainder > 0) parts.push(convertThreeDigits(remainder));

  return parts.join(' ').trim();
}

/**
 * Universal Currency Amount in Words
 * @param {number|string} amount 
 * @param {string} currencyCode - ISO 4217 code (INR, USD, EUR, etc.)
 * @returns {string} E.g., "Rupees Twelve Lakh Fifty Thousand Only" or "USD Twelve Thousand Five Hundred Dollars Only"
 */
export function amountInWords(amount, currencyCode = 'INR') {
  const numericAmount = parseFloat(amount);
  const config = getCurrencyConfig(currencyCode);

  if (isNaN(numericAmount) || numericAmount < 0) {
    return `${config.majorWord} Zero Only`;
  }

  const integerPart = Math.floor(numericAmount);
  const decimals = config.decimals;
  const factor = Math.pow(10, decimals);
  const minorPart = decimals > 0 ? Math.round((numericAmount - integerPart) * factor) : 0;

  let words = '';
  if (config.numberingSystem === 'indian') {
    words = convertIndianNumber(integerPart);
  } else {
    words = convertInternationalNumber(integerPart);
  }

  let result = '';
  if (config.code === 'INR') {
    result = `Rupees ${words}`;
  } else {
    result = `${config.code} ${words} ${config.majorWord}`;
  }

  if (minorPart > 0 && config.minorWord) {
    const minorWords = convertTwoDigits(minorPart);
    result += ` and ${minorWords} ${config.minorWord}`;
  }

  result += ' Only';
  return result.replace(/\s+/g, ' ').trim();
}
