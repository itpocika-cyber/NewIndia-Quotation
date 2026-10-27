/**
 * Validation utilities for Masters and Quotation forms.
 */

// Regex patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\s\-()]{7,15}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;

/**
 * Validates required field
 */
export function isRequired(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return !isNaN(value);
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Validates positive number (> 0)
 */
export function isPositiveNumber(value) {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
}

/**
 * Validates non-negative number (>= 0)
 */
export function isNonNegative(value) {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0;
}

/**
 * Validates email format
 */
export function isValidEmail(email) {
  if (!email) return true; // Optional field validity
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates phone format
 */
export function isValidPhone(phone) {
  if (!phone) return true;
  return PHONE_REGEX.test(phone.trim());
}

/**
 * Validates Indian GSTIN (15 alphanumeric characters)
 */
export function isValidGSTIN(gstin) {
  if (!gstin) return true; // Can be optional for non-GST clients
  return GSTIN_REGEX.test(gstin.trim());
}

/**
 * Validates Indian PAN (10 alphanumeric characters)
 */
export function isValidPAN(pan) {
  if (!pan) return true;
  return PAN_REGEX.test(pan.trim());
}

/**
 * Validates that end date is on or after start date
 */
export function isValidDateRange(startDate, endDate) {
  if (!startDate || !endDate) return true;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return end >= start;
}

/**
 * Checks for duplicate field value in a collection
 */
export function isDuplicate(items = [], field, value, currentId = null, idField = 'id') {
  if (!value) return false;
  const cleanVal = String(value).trim().toLowerCase();
  return items.some(item => {
    if (currentId && item[idField] === currentId) return false;
    return String(item[field] || '').trim().toLowerCase() === cleanVal;
  });
}
