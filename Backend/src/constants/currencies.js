/**
 * Standard ISO 4217 Currency Definitions & Formatting Rules (Backend Mirror)
 * Supports: INR, USD, EUR, GBP, AED, SAR, SGD, AUD, CAD, JPY
 */

export const SUPPORTED_CURRENCIES = {
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    decimals: 2,
    locale: 'en-IN',
    defaultExchangeRate: 1,
    majorWord: 'Rupees',
    minorWord: 'Paise',
    numberingSystem: 'indian'
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimals: 2,
    locale: 'en-US',
    defaultExchangeRate: 86.50,
    majorWord: 'Dollars',
    minorWord: 'Cents',
    numberingSystem: 'international'
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimals: 2,
    locale: 'de-DE',
    defaultExchangeRate: 94.20,
    majorWord: 'Euros',
    minorWord: 'Cents',
    numberingSystem: 'international'
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    decimals: 2,
    locale: 'en-GB',
    defaultExchangeRate: 110.80,
    majorWord: 'Pounds',
    minorWord: 'Pence',
    numberingSystem: 'international'
  },
  AED: {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'AED ',
    decimals: 2,
    locale: 'en-AE',
    defaultExchangeRate: 23.55,
    majorWord: 'Dirhams',
    minorWord: 'Fils',
    numberingSystem: 'international'
  },
  SAR: {
    code: 'SAR',
    name: 'Saudi Riyal',
    symbol: 'SAR ',
    decimals: 2,
    locale: 'en-SA',
    defaultExchangeRate: 23.05,
    majorWord: 'Riyals',
    minorWord: 'Halalas',
    numberingSystem: 'international'
  },
  SGD: {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    decimals: 2,
    locale: 'en-SG',
    defaultExchangeRate: 64.80,
    majorWord: 'Dollars',
    minorWord: 'Cents',
    numberingSystem: 'international'
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    decimals: 2,
    locale: 'en-AU',
    defaultExchangeRate: 55.40,
    majorWord: 'Dollars',
    minorWord: 'Cents',
    numberingSystem: 'international'
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    decimals: 2,
    locale: 'en-CA',
    defaultExchangeRate: 61.20,
    majorWord: 'Dollars',
    minorWord: 'Cents',
    numberingSystem: 'international'
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    decimals: 0,
    locale: 'ja-JP',
    defaultExchangeRate: 0.58,
    majorWord: 'Yen',
    minorWord: '',
    numberingSystem: 'international'
  }
};

export const BASE_CURRENCY_CODE = 'INR';

export function getCurrencyConfig(code = 'INR') {
  const normalized = (code || 'INR').toUpperCase();
  return SUPPORTED_CURRENCIES[normalized] || SUPPORTED_CURRENCIES.INR;
}
