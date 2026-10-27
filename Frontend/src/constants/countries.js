/**
 * Standard Countries & Regions Configuration for Pocika Quotation System
 * Supports Indian States and International Jurisdictions
 */

export const COUNTRIES = [
  { code: 'IN', name: 'India', defaultCurrency: 'INR', isExport: false, taxLabel: 'GSTIN', idLabel: 'PAN' },
  { code: 'AE', name: 'United Arab Emirates (UAE)', defaultCurrency: 'AED', isExport: true, taxLabel: 'VAT TRN No.', idLabel: 'Trade License No.' },
  { code: 'SA', name: 'Saudi Arabia', defaultCurrency: 'SAR', isExport: true, taxLabel: 'VAT / ZATCA Registration', idLabel: 'CR Number' },
  { code: 'RU', name: 'Russia', defaultCurrency: 'USD', isExport: true, taxLabel: 'INN / KPP Number', idLabel: 'OGRN / Registration' },
  { code: 'US', name: 'United States (USA)', defaultCurrency: 'USD', isExport: true, taxLabel: 'Federal EIN / Tax ID', idLabel: 'State Business ID' },
  { code: 'GB', name: 'United Kingdom (UK)', defaultCurrency: 'GBP', isExport: true, taxLabel: 'UK VAT Number', idLabel: 'Company Reg No. (CRN)' },
  { code: 'DE', name: 'Germany', defaultCurrency: 'EUR', isExport: true, taxLabel: 'USt-IdNr. (VAT ID)', idLabel: 'Handelsregister No.' },
  { code: 'SG', name: 'Singapore', defaultCurrency: 'SGD', isExport: true, taxLabel: 'GST Reg No.', idLabel: 'UEN Number' },
  { code: 'AU', name: 'Australia', defaultCurrency: 'AUD', isExport: true, taxLabel: 'ABN / ACN Number', idLabel: 'Business Reg' },
  { code: 'CA', name: 'Canada', defaultCurrency: 'CAD', isExport: true, taxLabel: 'CRA Business No. (BN/GST)', idLabel: 'Corporate Access No.' },
  { code: 'OM', name: 'Oman', defaultCurrency: 'USD', isExport: true, taxLabel: 'VAT Identification No.', idLabel: 'Commercial Reg (CR)' },
  { code: 'QA', name: 'Qatar', defaultCurrency: 'USD', isExport: true, taxLabel: 'Tax Identification TIN', idLabel: 'CR Number' },
  { code: 'KW', name: 'Kuwait', defaultCurrency: 'USD', isExport: true, taxLabel: 'Tax Card / Reg No.', idLabel: 'Commercial License' },
  { code: 'ZA', name: 'South Africa', defaultCurrency: 'USD', isExport: true, taxLabel: 'VAT Number', idLabel: 'CIPC Registration' },
  { code: 'KE', name: 'Kenya', defaultCurrency: 'USD', isExport: true, taxLabel: 'KRA PIN', idLabel: 'Business Permit' },
  { code: 'NG', name: 'Nigeria', defaultCurrency: 'USD', isExport: true, taxLabel: 'TIN Number', idLabel: 'CAC Reg No.' },
  { code: 'OTHER', name: 'Other International Country', defaultCurrency: 'USD', isExport: true, taxLabel: 'Tax ID / VAT No.', idLabel: 'Commercial Reg No.' }
];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

export function getCountryConfig(countryName) {
  if (!countryName) return COUNTRIES[0];
  const normalized = countryName.trim().toLowerCase();
  const match = COUNTRIES.find(
    (c) => c.name.toLowerCase() === normalized || c.code.toLowerCase() === normalized
  );
  return match || {
    code: 'CUSTOM',
    name: countryName,
    defaultCurrency: 'USD',
    isExport: true,
    taxLabel: 'Tax ID / VAT No.',
    idLabel: 'Business Reg No.'
  };
}
