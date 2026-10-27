/**
 * Indian GSTIN and PAN validation utilities.
 * Includes format validation, state code validation, and Modulus 36 checksum calculation.
 */

const GST_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Valid Indian State/UT GST State codes (01 to 38, 97, 99)
const VALID_STATE_CODES = new Set([
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
  '31', '32', '33', '34', '35', '36', '37', '38', '97', '99'
]);

/**
 * Validates 15-character GSTIN format via regex
 */
export function isValidGstinFormat(gstin) {
  if (!gstin || typeof gstin !== 'string') return false;
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
  return regex.test(gstin.trim());
}

/**
 * Validates 10-character PAN format
 */
export function isValidPanFormat(pan) {
  if (!pan || typeof pan !== 'string') return false;
  const regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
  return regex.test(pan.trim());
}

/**
 * Calculate standard Modulus-36 Luhn-like check digit for GSTIN
 */
export function calculateGstinCheckDigit(first14) {
  if (!first14 || first14.length !== 14) return null;
  const clean = first14.toUpperCase();
  let sum = 0;

  for (let i = 0; i < 14; i++) {
    const char = clean[i];
    const codePoint = GST_CHARS.indexOf(char);
    if (codePoint === -1) return null;

    const factor = (i % 2 === 0) ? 1 : 2;
    const product = codePoint * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }

  const remainder = sum % 36;
  const checkDigitIndex = (36 - remainder) % 36;
  return GST_CHARS[checkDigitIndex];
}

/**
 * Comprehensive GSTIN validator
 */
export function validateGSTIN(gstin, options = { strictChecksum: false }) {
  if (!gstin) return { isValid: true };
  const clean = gstin.trim().toUpperCase();

  if (!isValidGstinFormat(clean)) {
    return {
      isValid: false,
      reason: 'GSTIN must be 15 alphanumeric characters matching format: 2 digits + 10 PAN chars + 1 entity + Z + 1 check digit.'
    };
  }

  const stateCode = clean.substring(0, 2);
  if (!VALID_STATE_CODES.has(stateCode)) {
    return {
      isValid: false,
      reason: `Invalid GST state code '${stateCode}'. Valid state codes are 01-38, 97, 99.`
    };
  }

  const panPart = clean.substring(2, 12);
  if (!isValidPanFormat(panPart)) {
    return {
      isValid: false,
      reason: `PAN component '${panPart}' in GSTIN is invalid.`
    };
  }

  const expectedCheckDigit = calculateGstinCheckDigit(clean.substring(0, 14));
  const actualCheckDigit = clean[14];
  const checksumMatches = expectedCheckDigit === actualCheckDigit;

  if (options.strictChecksum && !checksumMatches) {
    return {
      isValid: false,
      reason: `GSTIN checksum mismatch. Expected check digit '${expectedCheckDigit}', found '${actualCheckDigit}'.`
    };
  }

  return {
    isValid: true,
    checksumMatches,
    stateCode,
    pan: panPart,
    expectedCheckDigit
  };
}
