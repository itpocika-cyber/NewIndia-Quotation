import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCurrencyConfig } from '../constants/currencies.js';
import { amountInWords } from '../utils/amountInWords.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export { amountInWords };

export function formatCurrency(value = 0, showSymbol = true, currencyCode = 'INR') {
  const num = Number(value) || 0;
  const config = getCurrencyConfig(currencyCode);
  const formatted = num.toLocaleString(config.locale || 'en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals
  });
  return showSymbol ? `${config.symbol}${formatted}` : formatted;
}

export function formatDisplayDate(dateStr) {
  if (!dateStr) return '-';
  const str = String(dateStr);
  if (str.includes('/') || (str.includes('-') && str.split('-')[0].length <= 2)) {
    return str;
  }
  const parts = str.split('T')[0].split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }
  return str;
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper to get Base64 Logo data URI
export function getLogoDataUri(customLogoUrl) {
  try {
    if (customLogoUrl && customLogoUrl.startsWith('data:image')) {
      return customLogoUrl;
    }
    const publicLogoPath = path.resolve(__dirname, '../../../Frontend/public/logo.png');
    if (fs.existsSync(publicLogoPath)) {
      const buffer = fs.readFileSync(publicLogoPath);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    }
  } catch (err) {
    console.warn('Could not read local logo.png for template:', err.message);
  }
  return customLogoUrl || '/logo.png';
}

/**
 * Builds the header template HTML string (reused in Puppeteer native header and web view)
 */
export function buildHeaderTemplate(quotation, company) {
  const activeCompany = quotation.companySnapshot || company || {};
  const logoDataUri = getLogoDataUri(activeCompany.logoUrl);

  const address = [
    activeCompany.address,
    activeCompany.city,
    activeCompany.state ? (activeCompany.pincode ? `${activeCompany.state} - ${activeCompany.pincode}` : activeCompany.state) : activeCompany.pincode
  ].filter(Boolean).join(', ');

  const salesPerson = quotation.preparedBy || quotation.salesPerson || quotation.createdByName || quotation.createdBy?.name || 'Pocika Staff';

  return `
    <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 9px; width: 100%; padding: 0 10mm; box-sizing: border-box; -webkit-print-color-adjust: exact;">
      <!-- Dual Brand Header Stripe (70% #B3261E, 30% #0f172a) -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px; table-layout: fixed;">
        <tbody>
          <tr>
            <td style="height: 3px; background-color: #B3261E; width: 70%; padding: 0;"></td>
            <td style="height: 3px; background-color: #0f172a; width: 30%; padding: 0;"></td>
          </tr>
        </tbody>
      </table>

      <!-- Letterhead Header & Commercial Meta (62% / 38% Split) -->
      <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
        <tbody>
          <tr>
            <!-- Left: Brand Identity & Regd Office (62%) -->
            <td style="width: 62%; vertical-align: top; padding-right: 8px;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
                <tbody>
                  <tr>
                    <td style="width: 58px; vertical-align: middle; padding: 0; padding-right: 10px;">
                      <img src="${logoDataUri}" alt="POCIKA" style="height: 46px; width: auto; max-width: 58px; max-height: 46px; object-fit: contain; display: block; image-rendering: -webkit-optimize-contrast;" />
                    </td>
                    <td style="vertical-align: middle; padding: 0;">
                      <div style="font-size: 15px; font-weight: bold; color: #B3261E; line-height: 18px; letter-spacing: -0.2px;">
                        ${escapeHtml(activeCompany.name || 'POCIKA FIRE AND SAFETY PRODUCTS LLP')}
                      </div>
                      <div style="font-size: 8.5px; font-weight: bold; color: #475569; line-height: 12px; text-transform: uppercase; letter-spacing: 0.2px; margin-top: 1px;">
                        Fire Protection &amp; Safety Equipment Suppliers | LLPIN: ${escapeHtml(activeCompany.llpin || 'ABA-3518')}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style="font-size: 9px; color: #475569; line-height: 13px; margin-top: 2px;">
                ${escapeHtml(address)}
              </div>

              <div style="font-size: 9px; color: #1e293b; line-height: 13px;">
                <strong>Tel:</strong> ${escapeHtml(activeCompany.phone || '+91 70965 64828')}
                ${activeCompany.altPhone ? ` / ${escapeHtml(activeCompany.altPhone)}` : ''}
                | <strong>Email:</strong> ${escapeHtml(activeCompany.email || 'sales@pocikafireandsafety.com')}
              </div>

              <div style="font-size: 9px; color: #1e293b; line-height: 13px; margin-top: 1px;">
                <strong>GSTIN:</strong> <span style="font-weight: bold; background-color: #f1f5f9; padding: 1px 4px; border-radius: 2px;">${escapeHtml(activeCompany.gstin || '24ABAFP3518F1Z4')}</span>
                <span> (State: ${escapeHtml(activeCompany.state || 'Gujarat')} - 24)</span>
                ${activeCompany.pan ? ` | <strong>PAN:</strong> ${escapeHtml(activeCompany.pan)}` : ''}
              </div>
            </td>

            <!-- Right: Commercial Quotation Meta Card (38%) -->
            <td style="width: 38%; vertical-align: top; text-align: right;">
              <div style="text-align: right; margin-bottom: 2px;">
                <span style="display: inline-block; background: linear-gradient(135deg, #B3261E 0%, #991b1b 100%); color: #ffffff; padding: 2.5px 12px; border-radius: 3px; font-size: 10px; font-weight: 800; letter-spacing: 0.6px; text-align: center; border: 1px solid #7f1d1d; text-transform: uppercase; box-shadow: 0 1px 2px rgba(179,38,30,0.2);">
                  COMMERCIAL QUOTATION
                </span>
              </div>
              <table style="border-collapse: collapse; margin-left: auto; margin-top: 0px;">
                <tbody>
                  <tr>
                    <td style="text-align: right; color: #4e5c70ff; font-size: 10px; padding: 2px 6px 1px 0; white-space: nowrap;">Quotation No : </td>
                    <td style="text-align: right; font-weight: bold; color: #0f172a; font-size: 10px; padding: 1px 0; white-space: nowrap;">${escapeHtml(quotation.quotationNo || 'DRAFT')}</td>
                  </tr>
                  <tr>
                    <td style="text-align: right; color: #4e5c70ff; font-size: 10px; padding: 1px 6px 1px 0; white-space: nowrap;">Date of Issue : </td>
                    <td style="text-align: right; font-weight: bold; color: #0f172a; font-size: 10px; padding: 1px 0; white-space: nowrap;">${formatDisplayDate(quotation.quotationDate)}</td>
                  </tr>
                  ${quotation.validUntilDate ? `
                  <tr>
                    <td style="text-align: right; color: #4e5c70ff; font-size: 10px; padding: 1px 6px 1px 0; white-space: nowrap;">Valid Till : </td>
                    <td style="text-align: right; font-weight: bold; color: #B3261E; font-size: 10px; padding: 1px 0; white-space: nowrap;">${formatDisplayDate(quotation.validUntilDate)}</td>
                  </tr>` : ''}
                  ${quotation.referenceNo ? `
                  <tr>
                    <td style="text-align: right; color: #4e5c70ff; font-size: 10px; padding: 1px 6px 1px 0; white-space: nowrap;">Inquiry / Ref : </td>
                    <td style="text-align: right; color: #1e293b; font-size: 10px; padding: 1px 0; white-space: nowrap;">${escapeHtml(quotation.referenceNo)}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="text-align: right; color: #4e5c70ff; font-size: 10px; padding: 1px 6px 1px 0; white-space: nowrap;">Order No : </td>
                    <td style="text-align: right; color: #0f172a; font-weight: 600; font-size: 10px; padding: 1px 0; white-space: nowrap;">${escapeHtml(quotation.orderNo || 'Verbal Order')}</td>
                  </tr>
                  <tr>
                    <td style="text-align: right; color: #4e5c70ff; font-size: 10px; padding: 1px 6px 1px 0; white-space: nowrap;">Prepared By : </td>
                    <td style="text-align: right; color: #1e293b; font-weight: bold; font-size: 10px; padding: 1px 0; white-space: nowrap;">${escapeHtml(salesPerson)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Builds the footer template HTML string
 */
export function buildFooterTemplate(quotation, company) {
  const activeCompany = quotation.companySnapshot || company || {};
  const pdfSettings = activeCompany.settings || {};
  const footerText = pdfSettings.customFooterText || 'Thank you for your business! | This is a Computer Generated Quotation | Regd. Office: Surat, Gujarat | Subject to Surat Jurisdiction.';

  return `
    <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 8.5px; color: #475569; width: 100%; padding: 0 10mm; box-sizing: border-box; -webkit-print-color-adjust: exact;">
      <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #cbd5e1; padding-top: 5px;">
        <tbody>
          <tr>
            <td style="font-size: 8.5px; color: #475569; text-align: center; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; letter-spacing: 0.15px; padding-top: 4px;">
              ${escapeHtml(footerText)}
            </td>
            <td style="font-size: 8.5px; color: #0f172a; text-align: right; vertical-align: middle; white-space: nowrap; width: 85px; font-weight: 700; padding-top: 4px;">
              Page <span class="pageNumber"></span> of <span class="totalPages"></span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Builds the document body HTML (exact QuotationDocument layout and typography)
 */
export function buildDocumentBodyHtml(quotation, company) {
  const {
    quotationNo = 'DRAFT',
    orderNo = '',
    dispatchDetails = {},
    subject = '',
    customer = {},
    items = [],
    paymentTermsNote = '',
    selectedTerms = [],
    totals = {}
  } = quotation;

  const activeCompany = quotation.companySnapshot || company || {};
  const pdfSettings = activeCompany.settings || {};
  const showBankDetails = pdfSettings.showBankDetailsOnPDF !== false;
  const showSignature = pdfSettings.showSignatureOnPDF !== false;
  const sealBoxHeight = pdfSettings.signatureSealHeight || 170;
  const sealImageScale = pdfSettings.signatureSealScale || 1.15;
  const salesPerson = quotation.preparedBy || quotation.salesPerson || quotation.createdByName || quotation.createdBy?.name || 'Authorized Staff';

  // Currency configuration
  const currCode = (quotation.currency?.code || totals.currencyCode || 'INR').toUpperCase();
  const currCfg = getCurrencyConfig(currCode);
  const currencySymbol = quotation.currency?.symbol || totals.currencySymbol || currCfg.symbol;
  const exchangeRate = quotation.currency?.exchangeRate || 1;

  // Financials calculation (identical to QuotationDocument.jsx)
  const materialTotal = totals.materialTotal ?? items.reduce((acc, i) => {
    return acc + ((parseFloat(i.quantity) || 0) * (parseFloat(i.rate) || 0));
  }, 0);
  const laborTotal = totals.laborTotal ?? items.reduce((acc, i) => {
    return acc + ((parseFloat(i.quantity) || 0) * (parseFloat(i.laborRate) || 0));
  }, 0);
  const subtotal = totals.subtotal ?? (materialTotal + laborTotal);
  const overallDiscountPercent = Number(quotation.overallDiscountPercent ?? totals.overallDiscountPercent ?? 0) || 0;
  const totalDiscount = Number(totals.totalDiscount) || (
    overallDiscountPercent > 0
      ? (subtotal * overallDiscountPercent) / 100
      : items.reduce((acc, i) => {
        const qty = parseFloat(i.quantity) || 0;
        const r = (parseFloat(i.rate) || 0) + (parseFloat(i.laborRate) || 0);
        const raw = qty * r;
        return acc + ((raw * (parseFloat(i.discountPercent) || 0)) / 100);
      }, 0)
  );
  const taxableAmount = totals.totalTaxable ?? (subtotal - totalDiscount);

  const isInterState = totals.isInterState ?? Boolean(
    (customer.state && activeCompany.state && customer.state.trim().toLowerCase() !== activeCompany.state.trim().toLowerCase()) ||
    (customer.gstin && activeCompany.gstin && customer.gstin.substring(0, 2) !== activeCompany.gstin.substring(0, 2))
  );

  let cgstAmount = totals.cgstAmount ?? 0;
  let sgstAmount = totals.sgstAmount ?? 0;
  let igstAmount = totals.igstAmount ?? 0;
  let totalTax = totals.totalTax ?? 0;

  if (!totals.totalTax && totals.totalTax !== 0) {
    items.forEach((item) => {
      const raw = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
      const disc = (raw * (parseFloat(item.discountPercent) || 0)) / 100;
      const lineTaxable = raw - disc;
      const rate = parseFloat(item.gstRate) || 18;
      const lineTax = (lineTaxable * rate) / 100;
      totalTax += lineTax;
      if (isInterState) {
        igstAmount += lineTax;
      } else {
        cgstAmount += lineTax / 2;
        sgstAmount += lineTax / 2;
      }
    });
  }

  const rawGrand = taxableAmount + (totalTax || (isInterState ? igstAmount : cgstAmount + sgstAmount));
  const grandTotal = totals.grandTotal ?? (currCfg.decimals === 0 ? Math.round(rawGrand) : Number(rawGrand.toFixed(currCfg.decimals)));
  const roundOff = totals.roundOff ?? parseFloat((grandTotal - rawGrand).toFixed(2));
  const wordsText = totals.amountInWords || amountInWords(grandTotal, currCode);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quotation — ${escapeHtml(quotationNo)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin-top: 36mm;
      margin-bottom: 14mm;
      margin-left: 10mm;
      margin-right: 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-size: 9.5px;
      line-height: 1.35;
    }
    table {
      border-collapse: collapse;
      page-break-inside: auto;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-row-group; /* Prevent Chromium from repeating grand subtotal at bottom of every sliced page */
    }
    .avoid-break {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .item-row {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  </style>
</head>
<body>

  <!-- =========================================================================
       1. BUYER (BILL TO), SHIP TO & SUPPLY ASSESSMENT CARDS
       ========================================================================= -->
  <table
    class="avoid-break"
    style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 6px; background-color: #f8fafc; table-layout: fixed;"
  >
    <tbody>
      <tr>
        <!-- Left: Bill To Details (38%) -->
        <td style="width: 38%; padding: 6px 8px; vertical-align: top; border-right: 1px solid #cbd5e1;">
          <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; color: #B3261E; letter-spacing: 0.4px; margin-bottom: 2px;">
            BILL TO (BUYER)
          </div>
          <div style="font-size: 10.5px; font-weight: bold; color: #0f172a; line-height: 14px;">
            ${escapeHtml(customer.name || 'Valued Customer')}
          </div>
          ${customer.contactPerson ? `
          <div style="font-size: 8.5px; color: #1e293b; margin-top: 1px;">
            <strong>Attn:</strong> ${escapeHtml(customer.contactPerson)}
          </div>` : ''}
          ${customer.billingAddress ? `
          <div style="font-size: 8.5px; color: #475569; margin-top: 1px; line-height: 12px;">
            ${escapeHtml(customer.billingAddress)}
          </div>` : ''}
          <div style="font-size: 8.5px; color: #475569;">
            ${escapeHtml([customer.city, customer.state ? (customer.pincode ? `${customer.state} - ${customer.pincode}` : customer.state) : customer.pincode, customer.country && customer.country.toLowerCase() !== 'india' ? customer.country : ''].filter(Boolean).join(', '))}
          </div>
          ${customer.phone || customer.email ? `
          <div style="font-size: 8.5px; color: #1e293b; margin-top: 2px;">
            ${customer.phone ? `<strong>Ph:</strong> ${escapeHtml(customer.phone)}` : ''}
            ${customer.email ? ` <strong>Email:</strong> ${escapeHtml(customer.email)}` : ''}
          </div>` : ''}
          ${customer.country && customer.country.toLowerCase() !== 'india' ? `
          <div style="font-size: 8.5px; color: #0f172a; margin-top: 2px;">
            ${customer.taxId || customer.gstin ? `<strong>Tax ID / VAT:</strong> <span style="font-weight: bold;">${escapeHtml(customer.taxId || customer.gstin)}</span>` : `<strong>Tax Status:</strong> <span style="font-weight: 600;">Foreign Importer (Zero-Rated Export)</span>`}
            ${customer.foreignRegNo ? ` | <strong>Reg No:</strong> ${escapeHtml(customer.foreignRegNo)}` : ''}
          </div>` : `
          <div style="font-size: 8.5px; color: #0f172a; margin-top: 2px;">
            <strong>GSTIN:</strong> <span style="font-weight: bold;">${escapeHtml(customer.gstin || 'Unregistered')}</span>
            ${customer.pan ? ` | <strong>PAN:</strong> ${escapeHtml(customer.pan)}` : ''}
          </div>`}
        </td>

        <!-- Middle: Ship To Details (36%) -->
        <td style="width: 36%; padding: 6px 8px; vertical-align: top; border-right: 1px solid #cbd5e1;">
          <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; color: #0f172a; letter-spacing: 0.4px; margin-bottom: 2px;">
            SHIP TO (DELIVERY SITE)
          </div>
          <div style="font-size: 10px; font-weight: bold; color: #0f172a; line-height: 13px;">
            ${customer.siteName ? `<span style="color: #B3261E;">Project / Site:</span> ${escapeHtml(customer.siteName)}` : escapeHtml(customer.shippingName || customer.name || 'Same as Billing Address')}
          </div>
          ${customer.shippingContactPerson || customer.contactPerson ? `
          <div style="font-size: 8.5px; color: #1e293b; margin-top: 1px;">
            <strong>Site Incharge / Attn:</strong> ${escapeHtml(customer.shippingContactPerson || customer.contactPerson)}
            ${customer.shippingPhone || customer.phone ? ` (Ph: ${escapeHtml(customer.shippingPhone || customer.phone)})` : ''}
          </div>` : ''}
          <div style="font-size: 8.5px; color: #475569; margin-top: 1px; line-height: 12px;">
            ${escapeHtml(customer.shippingAddress || customer.billingAddress || 'Delivery at customer project / site')}
          </div>
          <div style="font-size: 8.5px; color: #475569;">
            ${escapeHtml([customer.shippingCity || customer.city, customer.shippingState || customer.state, customer.shippingPincode || customer.pincode].filter(Boolean).join(', '))}
          </div>
          <div style="font-size: 8.5px; color: #0f172a; margin-top: 2px;">
            <strong>Order Ref:</strong> <span style="font-weight: 600; color: #B3261E;">${escapeHtml(orderNo || quotation.orderNo || 'Verbal Order')}</span>
          </div>
        </td>

        <!-- Right: Supply & Tax Assessment (26%) -->
        <td style="width: 26%; padding: 6px 8px; vertical-align: top;">
          <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; color: #0f172a; letter-spacing: 0.4px; margin-bottom: 2px;">
            SUPPLY &amp; TAX ASSESSMENT
          </div>
          <div style="font-size: 8.5px; color: #334155; line-height: 12px;">
            ${customer.country && customer.country.toLowerCase() !== 'india' ? `
              <strong>Destination:</strong> ${escapeHtml(customer.country)}
            ` : `
              <strong>Place of Supply:</strong> ${escapeHtml(customer.state || activeCompany.state || 'Gujarat')} (24)
            `}
          </div>
          <div style="margin-top: 3px;">
            ${(customer.country && customer.country.toLowerCase() !== 'india') || quotation.taxTreatment === 'EXPORT_ZERO_RATED' ? `
            <span
              style="display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: bold; background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;"
            >
              Export (0% GST LUT)
            </span>` : `
            <span
              style="display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: bold; background-color: ${isInterState ? '#eff6ff' : '#f0fdf4'}; color: ${isInterState ? '#1d4ed8' : '#15803d'}; border: 1px solid ${isInterState ? '#bfdbfe' : '#bbf7d0'};"
            >
              ${isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
            </span>`}
          </div>
          ${subject ? `
          <div style="font-size: 8.5px; color: #1e293b; margin-top: 3px; line-height: 12px;">
            <strong>Subject:</strong> ${escapeHtml(subject)}
          </div>` : ''}
        </td>
      </tr>
    </tbody>
  </table>

  <!-- =========================================================================
       2. ITEMIZED PRODUCT & SPECIFICATION TABLE (PAGINATED: 6 ON PG 1, REST ON PG 2)
       ========================================================================= -->
  ${(() => {
      const renderTable = (sliceItems, startIndex) => `
      <table
        style="width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 8px; border: 1px solid #cbd5e1; table-layout: fixed;"
      >
        <colgroup>
          <col style="width: 4%;" />
          <col style="width: 36%;" />
          <col style="width: 6%;" />
          <col style="width: 6%;" />
          <col style="width: 10%;" />
          <col style="width: 10%;" />
          <col style="width: 10%;" />
          <col style="width: 9%;" />
          <col style="width: 9%;" />
        </colgroup>
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff; white-space: nowrap;">
            <th style="padding: 6px 2px; text-align: center; vertical-align: middle; border-right: 1px solid #334155; font-size: 8.5px; white-space: nowrap;">#</th>
            <th style="padding: 6px 6px; text-align: left; vertical-align: middle; border-right: 1px solid #334155; font-size: 8.5px; white-space: nowrap;">Item Description &amp; Specifications</th>
            <th style="padding: 6px 2px; text-align: center; vertical-align: middle; border-right: 1px solid #334155; font-size: 8.5px; white-space: nowrap;">Qty</th>
            <th style="padding: 6px 2px; text-align: center; vertical-align: middle; border-right: 1px solid #334155; font-size: 8.5px; white-space: nowrap;">Unit</th>
            <th style="padding: 6px 4px; text-align: center; vertical-align: middle; border-right: 1px solid #334155; font-size: 8.5px; white-space: nowrap;">Supply (${escapeHtml(currencySymbol.trim())})</th>
            <th style="padding: 6px 4px; text-align: center; vertical-align: middle; border-right: 1px solid #334155; font-size: 8.5px; white-space: nowrap;">Labour (${escapeHtml(currencySymbol.trim())})</th>
            <th style="padding: 6px 4px; text-align: center; vertical-align: middle; border-right: 1px solid #334155; font-size: 8.5px; white-space: nowrap;">Total Supply (${escapeHtml(currencySymbol.trim())})</th>
            <th style="padding: 6px 4px; text-align: center; vertical-align: middle; border-right: 1px solid #334155; font-size: 8.5px; white-space: nowrap;">Total Labour (${escapeHtml(currencySymbol.trim())})</th>
            <th style="padding: 6px 4px; text-align: center; vertical-align: middle; font-size: 8.5px; background-color: #1e293b; white-space: nowrap;">Total (${escapeHtml(currencySymbol.trim())})</th>
          </tr>
        </thead>
        <tbody>
          ${sliceItems.map((item, localIdx) => {
        const globalIdx = startIndex + localIdx;
        const itemImg = item.imageUrl || '';
        const qty = parseFloat(item.quantity) || 0;
        const supplyRate = parseFloat(item.rate) || 0;
        const laborRate = parseFloat(item.laborRate) || 0;
        const lineSupplyTotal = qty * supplyRate;
        const lineLaborTotal = qty * laborRate;
        const lineCombinedTotal = lineSupplyTotal + lineLaborTotal;
        const hasHsn = Boolean(item.hsnCode && item.hsnCode.trim() && item.hsnCode.trim() !== '-');

        return `
            <tr
              class="item-row avoid-break"
              style="border-bottom: 1px solid #e2e8f0; background-color: ${globalIdx % 2 === 1 ? '#f8fafc' : '#ffffff'};"
            >
              <td style="padding: 6px 2px; text-align: center; vertical-align: middle; line-height: 14px; border-right: 1px solid #e2e8f0; color: #64748b; font-size: 9px;">
                ${globalIdx + 1}
              </td>
              <td style="padding: 6px 6px; vertical-align: middle; line-height: 14px; border-right: 1px solid #e2e8f0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tbody>
                    <tr>
                      ${itemImg ? `
                      <td style="width: 48px; vertical-align: middle; padding: 0; padding-right: 6px;">
                        <div style="width: 44px; height: 44px; border-radius: 4px; border: 1px solid #cbd5e1; background-color: #ffffff; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 1px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
                          <img src="${itemImg}" alt="" style="max-width: 42px; max-height: 42px; object-fit: contain; display: block;" />
                        </div>
                      </td>` : ''}
                      <td style="vertical-align: middle; padding: 0;">
                        <div style="font-weight: bold; color: #0f172a; font-size: 9.5px; line-height: 14px;">
                          ${escapeHtml(item.name || '')}
                        </div>
                        ${(item.make || hasHsn) ? `
                        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 2px; line-height: 12px;">
                          ${item.make ? `
                          <span style="font-size: 8.5px; color: #B3261E; font-weight: bold; letter-spacing: 0.2px;">
                            Make: ${escapeHtml(item.make)}
                          </span>` : ''}
                          ${hasHsn ? `
                          <span style="font-size: 8px; color: #475569; background-color: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-weight: 600;">
                            HSN/SAC: ${escapeHtml(item.hsnCode)}
                          </span>` : ''}
                        </div>` : ''}
                        ${item.description ? `
                        <div style="font-size: 8px; color: #475569; margin-top: 2px; line-height: 11px;">
                          ${escapeHtml(item.description)}
                        </div>` : ''}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td style="padding: 6px 2px; text-align: center; font-weight: bold; vertical-align: middle; line-height: 14px; border-right: 1px solid #e2e8f0; font-size: 9px; white-space: nowrap;">
                ${qty}
              </td>
              <td style="padding: 6px 2px; text-align: center; vertical-align: middle; line-height: 14px; border-right: 1px solid #e2e8f0; color: #475569; font-size: 9px; white-space: nowrap;">
                ${escapeHtml(item.unit || 'Nos')}
              </td>
              <td style="padding: 6px 5px; text-align: right; vertical-align: middle; line-height: 14px; border-right: 1px solid #e2e8f0; font-size: 9px; white-space: nowrap; font-weight: 500;">
                ${formatCurrency(supplyRate, false, currCode)}
              </td>
              <td style="padding: 6px 5px; text-align: right; vertical-align: middle; line-height: 14px; border-right: 1px solid #e2e8f0; font-size: 9px; white-space: nowrap; color: #1e293b;">
                ${laborRate > 0 ? formatCurrency(laborRate, false, currCode) : '-'}
              </td>
              <td style="padding: 6px 6px; text-align: right; font-weight: bold; vertical-align: middle; line-height: 14px; border-right: 1px solid #e2e8f0; font-size: 9px; white-space: nowrap; color: #0f172a;">
                ${formatCurrency(lineSupplyTotal, false, currCode)}
              </td>
              <td style="padding: 6px 6px; text-align: right; font-weight: bold; vertical-align: middle; line-height: 14px; border-right: 1px solid #e2e8f0; font-size: 9px; white-space: nowrap; color: #059669;">
                ${formatCurrency(lineLaborTotal, false, currCode)}
              </td>
              <td style="padding: 6px 6px; text-align: right; font-weight: bold; vertical-align: middle; line-height: 14px; font-size: 9px; white-space: nowrap; color: #0f172a; background-color: #f1f5f9;">
                ${formatCurrency(lineCombinedTotal, false, currCode)}
              </td>
            </tr>`;
      }).join('')}
        </tbody>
        <tfoot>
          <tr style="background-color: #f1f5f9; border-top: 2px solid #cbd5e1; font-weight: bold; font-size: 9.5px; color: #0f172a;">
            <td colspan="2" style="padding: 6px 8px; text-align: left; border-right: 1px solid #cbd5e1;">
              Total: ${items.length} ${items.length === 1 ? 'Item' : 'Items'}
            </td>
            <td style="padding: 6px 2px; text-align: center; border-right: 1px solid #cbd5e1;">
              ${items.reduce((s, it) => s + (parseFloat(it.quantity) || 0), 0)}
            </td>
            <td colspan="3" style="border-right: 1px solid #cbd5e1; text-align: right; padding-right: 8px; color: #64748b; font-size: 9px; font-weight: bold;">Grand Subtotal:</td>
            <td style="padding: 6px 6px; text-align: right; border-right: 1px solid #cbd5e1; color: #0f172a; font-weight: bold;">
              ${formatCurrency(materialTotal, false, currCode)}
            </td>
            <td style="padding: 6px 6px; text-align: right; border-right: 1px solid #cbd5e1; color: #059669; font-weight: bold;">
              ${formatCurrency(laborTotal, false, currCode)}
            </td>
            <td style="padding: 6px 6px; text-align: right; color: #B3261E; font-size: 10px; font-weight: 800; background-color: #f1f5f9;">
              ${formatCurrency(subtotal, false, currCode)}
            </td>
          </tr>
        </tfoot>
      </table>
    `;

      // Render table continuously. Chromium / Puppeteer handles row page-breaks naturally with .avoid-break and repeating thead
      return renderTable(items, 0);
    })()}

  <!-- =========================================================================
       DYNAMIC BOTTOM SPACER FOR CLOSEOUT BLOCK
       ========================================================================= -->
  <div id="quotation-closeout-spacer" style="width: 100%; height: 0px;"></div>

  <!-- =========================================================================
       COMBINED CLOSEOUT SECTION: FINANCIAL SUMMARY + TERMS & CONDITIONS + SIGNATORY
       Grouped together so they stay unified and sit at the end of the page
       ========================================================================= -->
  <div
    class="avoid-break quotation-closeout-block"
    id="quotation-closeout-block"
    style="page-break-inside: avoid !important; break-inside: avoid !important; width: 100%;"
  >

    <!-- 3. FINANCIAL SUMMARY & SETTLEMENT DETAILS (52% / 48% Split) -->
    <table
      style="width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed;"
    >
      <tbody>
        <tr>
          <!-- Left: Words and Bank Account Wire (52%) -->
          <td style="width: 52%; vertical-align: top; padding-right: 8px;">
            <!-- Amount in Words Box -->
            <div style="border: 1px solid #bfdbfe; background-color: #eff6ff; border-radius: 4px; padding: 6px 8px; margin-bottom: 6px;">
              <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; color: #1e40af; letter-spacing: 0.3px;">
                AMOUNT IN WORDS (${escapeHtml(currCode)})
              </div>
              <div style="font-size: 9.5px; font-weight: bold; color: #0f172a; margin-top: 2px; line-height: 14px; font-style: italic;">
                ${escapeHtml(wordsText)}
              </div>
            </div>

            <!-- Bank Account Settlement Card -->
            ${showBankDetails ? `
            <div style="border: 1px dashed #93c5fd; background-color: #f8fafc; border-radius: 4px; padding: 6px 8px;">
              <div style="font-size: 8.5px; font-weight: bold; color: #0f172a; margin-bottom: 3px;">
                Direct RTGS / NEFT Wire Settlement Details:
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 8.5px; line-height: 13px;">
                <tbody>
                  <tr>
                    <td style="color: #0f172a;">
                      <strong>Beneficiary:</strong> ${escapeHtml(activeCompany.name || 'POCIKA FIRE AND SAFETY PRODUCTS LLP')}
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #0f172a;">
                      <strong>Bank Name:</strong> ${escapeHtml(activeCompany.bankName || 'HDFC Bank Ltd.')} | <strong>A/C:</strong> ${escapeHtml(activeCompany.accountNo || '50200084605648')}
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #0f172a;">
                      <strong>IFSC:</strong> ${escapeHtml(activeCompany.ifsc || 'HDFC0000256')} | <strong>Branch:</strong> ${escapeHtml(activeCompany.branch || 'Ring Road, Surat, Gujarat')}
                    </td>
                  </tr>
                  ${activeCompany.upiId ? `
                  <tr>
                    <td style="color: #0f172a;">
                      <strong>UPI ID:</strong> ${escapeHtml(activeCompany.upiId)}
                    </td>
                  </tr>` : ''}
                </tbody>
              </table>
            </div>` : ''}
          </td>

          <!-- Right: Totals Breakdown Table (48%) -->
          <td style="width: 48%; vertical-align: top;">
            <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; border: 1px solid #e2e8f0; border-radius: 3px; overflow: hidden;">
              <tbody>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 4px 8px; color: #475569;">Gross Subtotal:</td>
                  <td style="padding: 4px 8px; text-align: right; font-weight: bold; color: #0f172a;">
                    ${formatCurrency(subtotal, true, currCode)}
                  </td>
                </tr>
                ${totalDiscount > 0 ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 4px 8px; color: #dc2626;">Trade Discount ${overallDiscountPercent > 0 ? `(${overallDiscountPercent}%):` : ':'}</td>
                  <td style="padding: 4px 8px; text-align: right; font-weight: bold; color: #dc2626;">
                    - ${formatCurrency(totalDiscount, true, currCode)}
                  </td>
                </tr>` : ''}
                <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
                  <td style="padding: 4px 8px; font-weight: bold; color: #0f172a;">Net Taxable Value:</td>
                  <td style="padding: 4px 8px; text-align: right; font-weight: bold; color: #0f172a;">
                    ${formatCurrency(taxableAmount, true, currCode)}
                  </td>
                </tr>
                ${isInterState ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 3.5px 8px; color: #475569;">Integrated GST (IGST):</td>
                  <td style="padding: 3.5px 8px; text-align: right; color: #0f172a;">
                    ${formatCurrency(igstAmount || totalTax, true, currCode)}
                  </td>
                </tr>` : `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 3.5px 8px; color: #475569;">CGST (9.00%):</td>
                  <td style="padding: 3.5px 8px; text-align: right; color: #0f172a;">
                    ${formatCurrency(cgstAmount || totalTax / 2, true, currCode)}
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 3.5px 8px; color: #475569;">SGST (9.00%):</td>
                  <td style="padding: 3.5px 8px; text-align: right; color: #0f172a;">
                    ${formatCurrency(sgstAmount || totalTax / 2, true, currCode)}
                  </td>
                </tr>`}
                ${roundOff !== 0 ? `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 3.5px 8px; color: #475569;">Round Off:</td>
                  <td style="padding: 3.5px 8px; text-align: right; color: #64748b;">
                    ${roundOff >= 0 ? `+ ${currencySymbol.trim()} ${Number(roundOff).toFixed(currCfg.decimals)}` : `- ${currencySymbol.trim()} ${Math.abs(Number(roundOff)).toFixed(currCfg.decimals)}`}
                  </td>
                </tr>` : ''}
                <tr style="border-top: 2px solid #cbd5e1; background-color: #f8fafc; color: #0f172a;">
                  <td style="padding: 6px 8px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px;">
                    GRAND TOTAL (${escapeHtml(currCode)}):
                  </td>
                  <td style="padding: 6px 8px; text-align: right; font-size: 12px; font-weight: 800; color: #0f172a;">
                    ${formatCurrency(grandTotal, true, currCode)}
                  </td>
                </tr>
                ${currCode !== 'INR' ? `
                <tr style="border-top: 1px dashed #cbd5e1; background-color: #f1f5f9; color: #475569; font-size: 8.5px;">
                  <td style="padding: 3px 8px;">
                    Reporting Equivalent (@ 1 ${escapeHtml(currCode)} = ₹${exchangeRate}):
                  </td>
                  <td style="padding: 3px 8px; text-align: right; font-weight: bold; color: #1e293b;">
                    ₹ ${(grandTotal * exchangeRate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>` : ''}
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 4. TERMS & CONDITIONS AND AUTHORIZED SIGNATORY (60% / 40% Split) -->
    <table
      style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 4px; table-layout: fixed;"
    >
      <tbody>
        <tr>
          <!-- Left: Commercial Terms (56%) -->
          <td style="width: 56%; padding: 8px 10px; vertical-align: top; border-right: 1px solid #cbd5e1;">
            <div style="font-size: 9.5px; font-weight: bold; text-transform: uppercase; color: #0f172a; margin-bottom: 3px; letter-spacing: 0.2px;">
              TERMS &amp; CONDITIONS:
            </div>
            ${paymentTermsNote ? `
            <div style="font-size: 9.5px; color: #1e293b; margin-bottom: 3px; line-height: 15px;">
              <strong>Payment Terms:</strong> ${escapeHtml(paymentTermsNote)}
            </div>` : ''}
            ${Array.isArray(selectedTerms) && selectedTerms.length > 0 ? `
            <div style="margin: 0; padding-left: 16px; font-size: 9.5px; color: #475569; line-height: 15px;">
              ${selectedTerms.map((term, i) => `
                <div style="margin-bottom: 2px;">
                  ${i + 1}. ${escapeHtml(typeof term === 'object' ? term.termText || term.title : term)}
                </div>
              `).join('')}
            </div>` : `
            <div style="margin: 0; padding-left: 16px; font-size: 9.5px; color: #475569; line-height: 15px;">
              <div>1. Quotation Validity: Valid for 30 calendar days from the date of issue.</div>
              <div>2. Delivery &amp; Dispatch: Dispatched from Surat warehouse / facility within 3 to 7 working days upon receipt of confirmed PO / LC.</div>
              <div>3. Warranty &amp; Support: 12 months standard OEM/brand warranty against manufacturing defects.</div>
              <div>4. ${((customer.country && customer.country.toLowerCase() !== 'india') || quotation.taxTreatment === 'EXPORT_ZERO_RATED') ? 'Export Taxation: Zero-Rated Supply under LUT / Bond as per Section 16 of IGST Act (0% GST applicable).' : 'Taxes &amp; Statutory Levies: GST is charged extra as specified. Any statutory tax revision shall be charged as applicable.'}</div>
            </div>`}
          </td>

          <!-- Right: Signatory Box (44%) -->
          <td style="width: 44%; padding: 6px 12px; vertical-align: bottom; text-align: center;">
            ${showSignature && activeCompany.signatureUrl ? `
              <div style="min-height: ${sealBoxHeight}px; height: ${sealBoxHeight}px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; overflow: hidden;">
                <img src="${escapeHtml(activeCompany.signatureUrl)}" alt="Signature & Seal" style="max-height: ${sealBoxHeight}px; max-width: 250px; object-fit: contain; margin: 0 auto; display: block; transform: scale(${sealImageScale}); transform-origin: center center;" />
              </div>
              <div style="font-size: 10px; font-weight: bold; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 4px; letter-spacing: 0.2px;">
                ${escapeHtml(activeCompany.signatoryName || activeCompany.signatoryTitle || 'Authorized Signatory')}
              </div>
              <div style="font-size: 8.5px; color: #475569; margin-top: 1px; font-weight: 600;">
                For ${escapeHtml(activeCompany.name || 'POCIKA FIRE AND SAFETY PRODUCTS LLP')}
              </div>
            ` : `
              <div style="height: ${sealBoxHeight}px;"></div>
              <div style="border-top: 2px solid #cbd5e1; padding-top: 4px;">
                <div style="font-size: 9px; font-weight: bold; color: #0f172a;">
                  Authorized Signatory &amp; Company Seal
                </div>
                <div style="font-size: 8px; color: #94a3b8; margin-top: 1px;">
                  For ${escapeHtml(activeCompany.name || 'POCIKA FIRE AND SAFETY PRODUCTS LLP')}
                </div>
              </div>
            `}
          </td>
        </tr>
      </tbody>
    </table>

  </div>

</body>
</html>
  `;
}

/**
 * Builds the Complete Standalone HTML Page
 * Combines header, body, and footer for direct browser viewing / printing at GET /:id/html
 */
export function buildFullHtmlPage(quotation, company) {
  const headerHtml = buildHeaderTemplate(quotation, company);
  const footerHtml = buildFooterTemplate(quotation, company);
  const bodyContentHtml = buildDocumentBodyHtml(quotation, company);

  // Extract inner contents of body from bodyContentHtml
  const bodyMatch = bodyContentHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const innerBody = bodyMatch ? bodyMatch[1] : bodyContentHtml;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quotation — ${escapeHtml(quotation.quotationNo || 'Draft')}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      margin: 0 auto;
      padding: 10mm;
      max-width: 210mm;
      background: #ffffff;
      color: #0f172a;
      font-size: 9px;
      line-height: 1.35;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    @media print {
      body {
        padding: 0;
        box-shadow: none;
        max-width: none;
      }
      .no-print {
        display: none !important;
      }
    }
    .avoid-break {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .item-row {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .page-header-container {
      margin-bottom: 12px;
    }
    .page-footer-container {
      margin-top: 14px;
    }
  </style>
</head>
<body>
  <!-- Print Controls Toolbar (Screen only) -->
  <div class="no-print" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;">
    <div style="font-size: 11px; font-weight: bold; color: #0f172a;">
      Quotation HTML Template — ${escapeHtml(quotation.quotationNo || 'Draft')}
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" style="background: #0f172a; color: #ffffff; border: none; padding: 6px 14px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">
        Print / Save to PDF
      </button>
      <a href="/api/v1/quotations/${encodeURIComponent(quotation.quotationNo || quotation._id)}/pdf" style="background: #B3261E; color: #ffffff; text-decoration: none; padding: 6px 14px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block;">
        Download Puppeteer PDF
      </a>
    </div>
  </div>

  <div class="page-header-container">
    ${headerHtml}
  </div>

  <div class="page-body-container">
    ${innerBody}
  </div>

  <div class="page-footer-container">
    ${footerHtml}
  </div>
</body>
</html>
  `;
}
