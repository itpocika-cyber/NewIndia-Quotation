import React from 'react';
import { formatCurrency, formatDisplayDate } from '../../utils/calculations';
import { amountInWords } from '../../utils/amountInWords';
import { useMasters } from '../../context/MastersContext';
import { getCurrencyConfig } from '../../constants/currencies';

/**
 * Executive Corporate Quotation Document Component
 * - Dynamic full-page fillup: Page fills completely before moving to the next page
 * - Fixed header & footer repeated on EVERY page in both print and screen preview
 * - Authorized Signatory without redundant Prepared By line
 * - Corporate blue accents for Amount in Words and Wire Settlement details
 */
export function QuotationDocument({ quotation, company, id = 'quotation-printable-doc', hideHeaderFooter = false, includeDigitalSignature = null }) {
  if (!quotation) return null;

  const {
    quotationNo = 'DRAFT',
    orderNo = '',
    dispatchDetails = {},
    quotationDate = '',
    validUntilDate = '',
    referenceNo = '',
    subject = '',
    customer = {},
    items = [],
    paymentTermsNote = '',
    selectedTerms = [],
    totals = {},
    salesPerson = ''
  } = quotation;

  const displayPreparedBy = salesPerson || quotation.preparedBy || quotation.createdByName || quotation.createdBy?.name || 'Authorized Staff';

  let products = [];
  try {
    const masters = useMasters();
    if (masters?.products) products = masters.products;
  } catch (e) {
    // Graceful fallback if rendered outside of MastersProvider
  }

  const currCode = (quotation.currency?.code || totals.currencyCode || 'INR').toUpperCase();
  const currCfg = getCurrencyConfig(currCode);
  const currencySymbol = quotation.currency?.symbol || totals.currencySymbol || currCfg.symbol;
  const exchangeRate = quotation.currency?.exchangeRate || 1;

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
        return acc + ((qty * r) * (parseFloat(i.discountPercent) || 0)) / 100;
      }, 0)
  );
  const totalTaxable = totals.totalTaxable ?? totals.taxableAmount ?? (subtotal - totalDiscount);
  const isInterState = totals.isInterState ?? (customer?.state && company?.state && customer.state.trim().toLowerCase() !== company.state.trim().toLowerCase()) ?? false;
  const cgstAmount = totals.cgstAmount ?? 0;
  const sgstAmount = totals.sgstAmount ?? 0;
  const igstAmount = totals.igstAmount ?? 0;
  const roundOff = totals.roundOff ?? 0;
  const rawGrand = totalTaxable + (isInterState ? igstAmount : (cgstAmount + sgstAmount)) + roundOff;
  const grandTotal = totals.grandTotal ?? (currCfg.decimals === 0 ? Math.round(rawGrand) : Number(rawGrand.toFixed(currCfg.decimals)));

  // Dynamic GST Rate labels
  const uniqueGstRates = [...new Set(items.map((i) => parseFloat(i.gstRate) || 0))];
  const singleRate = uniqueGstRates.length === 1 ? uniqueGstRates[0] : null;
  const cgstLabel = singleRate !== null ? `CGST (${(singleRate / 2).toFixed(2)}%):` : 'CGST (Intra-State):';
  const sgstLabel = singleRate !== null ? `SGST (${(singleRate / 2).toFixed(2)}%):` : 'SGST (Intra-State):';
  const igstLabel = singleRate !== null ? `IGST (${singleRate.toFixed(2)}%):` : 'IGST (Inter-State):';

  const activeCompany = quotation.companySnapshot || company || {};
  const logoSrc = activeCompany.logoUrl || '/logo.png';

  const pdfSettings = activeCompany.settings || {};
  const showBankDetails = pdfSettings.showBankDetailsOnPDF !== false;
  const showSignature = includeDigitalSignature !== null ? includeDigitalSignature : (pdfSettings.showSignatureOnPDF !== false);
  const sealBoxHeight = pdfSettings.signatureSealHeight || 170;
  const sealImageScale = pdfSettings.signatureSealScale || 1.15;
  const footerText = pdfSettings.customFooterText || 'Thank you for your business! | This is a Computer Generated Quotation | Regd. Office: Surat, Gujarat | Subject to Surat Jurisdiction.';

  const isExportDoc = (customer?.country && customer.country.toLowerCase() !== 'india') || quotation.taxTreatment === 'EXPORT_ZERO_RATED';

  const defaultTerms = [
    'Quotation Validity: Valid for 30 calendar days from the date of issue.',
    'Delivery & Dispatch: Dispatched from Surat warehouse / distribution facility within 3-7 working days upon receipt of confirmed PO / LC.',
    'Warranty & Support: 12 months comprehensive OEM warranty against manufacturing defects.',
    isExportDoc
      ? 'Export Taxation: Zero-Rated Supply under LUT / Bond as per Section 16 of IGST Act (0% GST applicable).'
      : 'Statutory Taxes: GST is charged extra as applicable under Indian GST laws.'
  ];

  const termsToDisplay = selectedTerms && selectedTerms.length > 0 ? selectedTerms : defaultTerms;

  // Use simple natural pagination: provide items array directly so the table and rows flow naturally
  // without artificial pixel cutoffs that leave blank pages
  const pages = [items || []];
  const totalPages = 1;

  // Helper to render letterhead header
  const renderHeader = (pageIndex, totalPagesCount) => {
    // On continuation pages (Page 2+), render a clean compact continuation header
    // so items have maximum space and header does not repeat needlessly
    if (pageIndex > 0) {
      return (
        <div style={{ marginBottom: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', tableLayout: 'fixed' }}>
            <tbody>
              <tr>
                <td style={{ height: '3px', backgroundColor: '#B3261E', width: '70%', padding: 0 }} />
                <td style={{ height: '3px', backgroundColor: '#0f172a', width: '30%', padding: 0 }} />
              </tr>
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 8px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 8px', fontSize: '9.5px', fontWeight: 'bold', color: '#B3261E' }}>
                  {activeCompany.name || 'POCIKA FIRE AND SAFETY PRODUCTS LLP'}
                  <span style={{ color: '#64748b', fontWeight: 500, marginLeft: '8px' }}>— Continuation Sheet</span>
                </td>
                <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: '9px', color: '#0f172a' }}>
                  <strong>Ref:</strong> {quotationNo} | <strong>Date:</strong> {formatDisplayDate(quotationDate)} | <strong>Client:</strong> {customer.name || 'Direct'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    // Page 1: Full official executive letterhead + Bill To / Ship To / Supply Assessment
    return (
      <div style={{ marginBottom: '4px' }}>
        {/* 1. Dual brand header stripe */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td style={{ height: '3px', backgroundColor: '#B3261E', width: '70%', padding: 0 }} />
              <td style={{ height: '3px', backgroundColor: '#0f172a', width: '30%', padding: 0 }} />
            </tr>
          </tbody>
        </table>

        {/* 2. Letterhead header & quotation meta */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              {/* Left: Brand Identity & Regd Office (62%) */}
              <td style={{ width: '62%', verticalAlign: 'top', paddingRight: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '58px', verticalAlign: 'middle', padding: 0, paddingRight: '10px' }}>
                        <img
                          src={logoSrc}
                          alt="POCIKA"
                          style={{
                            height: '46px',
                            width: 'auto',
                            maxWidth: '58px',
                            maxHeight: '46px',
                            display: 'block',
                            objectFit: 'contain',
                            imageRendering: '-webkit-optimize-contrast'
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </td>
                      <td style={{ verticalAlign: 'middle', padding: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#B3261E', lineHeight: '18px', letterSpacing: '-0.2px' }}>
                          {activeCompany.name || 'POCIKA FIRE AND SAFETY PRODUCTS LLP'}
                        </div>
                        <div style={{ fontSize: '8.5px', fontWeight: 'bold', color: '#475569', lineHeight: '12px', textTransform: 'uppercase', letterSpacing: '0.2px', marginTop: '1px' }}>
                          Fire Protection &amp; Safety Equipment Suppliers | LLPIN: {activeCompany.llpin || 'ABA-3518'}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ fontSize: '9px', color: '#475569', lineHeight: '13px', marginTop: '2px' }}>
                  {activeCompany.address}
                  {activeCompany.city && `, ${activeCompany.city}`}
                  {activeCompany.state && `, ${activeCompany.state}`}
                  {activeCompany.pincode && ` - ${activeCompany.pincode}`}
                </div>

                <div style={{ fontSize: '9px', color: '#1e293b', lineHeight: '13px' }}>
                  <strong>Tel:</strong> {activeCompany.phone || '+91 70965 64828'}
                  {activeCompany.altPhone && ` / ${activeCompany.altPhone}`}
                  <span> | <strong>Email:</strong> {activeCompany.email || 'sales@pocikafireandsafety.com'}</span>
                </div>

                <div style={{ fontSize: '9px', color: '#1e293b', lineHeight: '13px', marginTop: '1px' }}>
                  <strong>GSTIN:</strong> <span style={{ fontWeight: 'bold', backgroundColor: '#f1f5f9', padding: '1px 4px', borderRadius: '2px' }}>{activeCompany.gstin || '24ABAFP3518F1Z4'}</span>
                  <span> (State: {activeCompany.state || 'Gujarat'} - 24)</span>
                  {activeCompany.pan && <span> | <strong>PAN:</strong> {activeCompany.pan}</span>}
                </div>
              </td>

              {/* Right: Commercial Quotation Meta Card (38%) */}
              <td style={{ width: '38%', verticalAlign: 'top', textAlign: 'right' }}>
                <div style={{ textAlign: 'right', marginBottom: '2px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      background: 'linear-gradient(135deg, #B3261E 0%, #991b1b 100%)',
                      color: '#ffffff',
                      padding: '2.5px 12px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: '800',
                      letterSpacing: '0.6px',
                      textAlign: 'center',
                      boxShadow: '0 1px 2px rgba(179,38,30,0.2)',
                      border: '1px solid #7f1d1d',
                      textTransform: 'uppercase'
                    }}
                  >
                    COMMERCIAL QUOTATION
                  </span>
                </div>
                <table style={{ borderCollapse: 'collapse', marginLeft: 'auto', marginTop: '0px' }}>
                  <tbody>
                    <tr>
                      <td style={{ textAlign: 'right', color: '#4e5c70', fontSize: '10px', padding: '2px 6px 1px 0', whiteSpace: 'nowrap' }}>Quotation No : </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#0f172a', fontSize: '10px', padding: '1px 0', whiteSpace: 'nowrap' }}>
                        {quotationNo}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: 'right', color: '#4e5c70', fontSize: '10px', padding: '1px 6px 1px 0', whiteSpace: 'nowrap' }}>Date of Issue : </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#0f172a', fontSize: '10px', padding: '1px 0', whiteSpace: 'nowrap' }}>
                        {formatDisplayDate(quotationDate)}
                      </td>
                    </tr>
                    {validUntilDate && (
                      <tr>
                        <td style={{ textAlign: 'right', color: '#4e5c70', fontSize: '10px', padding: '1px 6px 1px 0', whiteSpace: 'nowrap' }}>Valid Till : </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#B3261E', fontSize: '10px', padding: '1px 0', whiteSpace: 'nowrap' }}>
                          {formatDisplayDate(validUntilDate)}
                        </td>
                      </tr>
                    )}
                    {referenceNo && (
                      <tr>
                        <td style={{ textAlign: 'right', color: '#4e5c70', fontSize: '10px', padding: '1px 6px 1px 0', whiteSpace: 'nowrap' }}>Inquiry / Ref : </td>
                        <td style={{ textAlign: 'right', color: '#1e293b', fontSize: '10px', padding: '1px 0', whiteSpace: 'nowrap' }}>{referenceNo}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ textAlign: 'right', color: '#4e5c70', fontSize: '10px', padding: '1px 6px 1px 0', whiteSpace: 'nowrap' }}>Order No : </td>
                      <td style={{ textAlign: 'right', color: '#0f172a', fontWeight: 600, fontSize: '10px', padding: '1px 0', whiteSpace: 'nowrap' }}>
                        {orderNo || 'Verbal Order'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: 'right', color: '#4e5c70', fontSize: '10px', padding: '1px 6px 1px 0', whiteSpace: 'nowrap' }}>Prepared By : </td>
                      <td style={{ textAlign: 'right', color: '#1e293b', fontWeight: 'bold', fontSize: '10px', padding: '1px 0', whiteSpace: 'nowrap' }}>
                        {displayPreparedBy}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Official Bill To, Ship To & Supply Assessment (3-Column Layout) */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            marginBottom: '6px',
            backgroundColor: '#f8fafc',
            tableLayout: 'fixed'
          }}
        >
          <colgroup>
            <col style={{ width: '38%' }} />
            <col style={{ width: '36%' }} />
            <col style={{ width: '26%' }} />
          </colgroup>
          <tbody>
            <tr>
              {/* Bill To */}
              <td style={{ padding: '6px 8px', verticalAlign: 'top', borderRight: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', color: '#B3261E', letterSpacing: '0.4px', marginBottom: '2px' }}>
                  BILL TO (BUYER)
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '10.5px', color: '#0f172a', lineHeight: '14px' }}>
                  {customer.name || 'Walk-in Client / Direct Inquiry'}
                </div>
                {customer.contactPerson && (
                  <div style={{ fontSize: '8.5px', color: '#1e293b', marginTop: '1px' }}>
                    <strong>Attn:</strong> {customer.contactPerson}
                  </div>
                )}
                <div style={{ fontSize: '8.5px', color: '#475569', lineHeight: '12px', marginTop: '1px' }}>
                  {customer.billingAddress || customer.address || 'Address on record'}
                  {customer.city && `, ${customer.city}`}
                  {customer.state && `, ${customer.state}`}
                  {customer.pincode && ` - ${customer.pincode}`}
                  {customer.country && customer.country.toLowerCase() !== 'india' && `, ${customer.country}`}
                </div>
                <div style={{ fontSize: '8.5px', color: '#334155', marginTop: '2px' }}>
                  {customer.phone && <span><strong>Ph:</strong> {customer.phone} </span>}
                  {customer.email && <span><strong>Email:</strong> {customer.email}</span>}
                </div>
                {customer.country && customer.country.toLowerCase() !== 'india' ? (
                  <div style={{ fontSize: '8.5px', color: '#0f172a', marginTop: '2px' }}>
                    {customer.taxId || customer.gstin ? (
                      <span><strong>Tax ID / VAT:</strong> <span style={{ fontWeight: 'bold' }}>{customer.taxId || customer.gstin}</span></span>
                    ) : (
                      <span><strong>Tax Status:</strong> <span style={{ fontWeight: 600 }}>Foreign Importer (0% GST)</span></span>
                    )}
                    {customer.foreignRegNo && <span> | <strong>Reg No:</strong> {customer.foreignRegNo}</span>}
                  </div>
                ) : (
                  <div style={{ fontSize: '8.5px', color: '#0f172a', marginTop: '2px' }}>
                    <strong>Buyer GSTIN:</strong> <span style={{ fontWeight: 'bold' }}>{customer.gstin || 'Unregistered'}</span>
                    {customer.pan && <span> | <strong>PAN:</strong> {customer.pan}</span>}
                  </div>
                )}
              </td>

              {/* Ship To */}
              <td style={{ padding: '6px 8px', verticalAlign: 'top', borderRight: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', color: '#0f172a', letterSpacing: '0.4px', marginBottom: '2px' }}>
                  SHIP TO (DELIVERY SITE)
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '10px', color: '#0f172a', lineHeight: '13px' }}>
                  {customer.siteName ? (
                    <span>
                      <span style={{ color: '#B3261E' }}>Project / Site:</span> {customer.siteName}
                    </span>
                  ) : (
                    customer.shippingName || customer.name || 'Same as Billing Address'
                  )}
                </div>
                {(customer.shippingContactPerson || customer.contactPerson) && (
                  <div style={{ fontSize: '8.5px', color: '#1e293b', marginTop: '1px' }}>
                    <strong>Site Incharge / Attn:</strong> {customer.shippingContactPerson || customer.contactPerson}
                    {(customer.shippingPhone || customer.phone) && ` (Ph: ${customer.shippingPhone || customer.phone})`}
                  </div>
                )}
                <div style={{ fontSize: '8.5px', color: '#475569', lineHeight: '12px', marginTop: '1px' }}>
                  {customer.shippingAddress || customer.billingAddress || 'Delivery at customer project / site'}
                </div>
                <div style={{ fontSize: '8.5px', color: '#475569' }}>
                  {[customer.shippingCity || customer.city, customer.shippingState || customer.state, customer.shippingPincode || customer.pincode].filter(Boolean).join(', ')}
                </div>
                <div style={{ fontSize: '8.5px', color: '#0f172a', marginTop: '2px' }}>
                  <strong>Order Ref:</strong> <span style={{ fontWeight: 600, color: '#B3261E' }}>{orderNo || 'Verbal Order'}</span>
                </div>
              </td>

              {/* Supply Assessment */}
              <td style={{ padding: '6px 8px', verticalAlign: 'top' }}>
                <div style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', color: '#0f172a', letterSpacing: '0.4px', marginBottom: '2px' }}>
                  SUPPLY &amp; TAX ASSESSMENT
                </div>
                <div style={{ fontSize: '8.5px', color: '#334155', lineHeight: '12px' }}>
                  {customer.country && customer.country.toLowerCase() !== 'india' ? (
                    <>
                      <strong>Destination:</strong> {customer.country}
                    </>
                  ) : (
                    <>
                      <strong>Place of Supply:</strong> {customer.state || activeCompany.state || 'Gujarat'} (24)
                    </>
                  )}
                </div>
                <div style={{ marginTop: '3px' }}>
                  {customer.country && customer.country.toLowerCase() !== 'india' || quotation.taxTreatment === 'EXPORT_ZERO_RATED' ? (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontSize: '8px',
                        fontWeight: 'bold',
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe'
                      }}
                    >
                      Export (0% GST LUT)
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontSize: '8px',
                        fontWeight: 'bold',
                        backgroundColor: isInterState ? '#eff6ff' : '#f0fdf4',
                        color: isInterState ? '#1d4ed8' : '#15803d',
                        border: `1px solid ${isInterState ? '#bfdbfe' : '#bbf7d0'}`
                      }}
                    >
                      {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                    </span>
                  )}
                </div>
                {subject && (
                  <div style={{ fontSize: '8.5px', color: '#1e293b', marginTop: '3px', lineHeight: '12px' }}>
                    <strong>Subject:</strong> {subject}
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Helper to render table for an item chunk
  const renderItemsTable = (chunkItems, startIndex, isLastPage = true) => (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '9px',
        marginBottom: '8px',
        border: '1px solid #cbd5e1',
        tableLayout: 'fixed'
      }}
    >
      <colgroup>
        <col style={{ width: '4%' }} />
        <col style={{ width: '36%' }} />
        <col style={{ width: '6%' }} />
        <col style={{ width: '6%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '9%' }} />
        <col style={{ width: '9%' }} />
      </colgroup>
      <thead>
        <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', whiteSpace: 'nowrap' }}>
          <th style={{ padding: '6px 2px', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #334155', fontSize: '8.5px', whiteSpace: 'nowrap' }}>#</th>
          <th style={{ padding: '6px 6px', textAlign: 'left', verticalAlign: 'middle', borderRight: '1px solid #334155', fontSize: '8.5px', whiteSpace: 'nowrap' }}>Item Description &amp; Specifications</th>
          <th style={{ padding: '6px 2px', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #334155', fontSize: '8.5px', whiteSpace: 'nowrap' }}>Qty</th>
          <th style={{ padding: '6px 2px', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #334155', fontSize: '8.5px', whiteSpace: 'nowrap' }}>Unit</th>
          <th style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #334155', fontSize: '8.5px', whiteSpace: 'nowrap' }}>Supply ({currencySymbol.trim()})</th>
          <th style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #334155', fontSize: '8.5px', whiteSpace: 'nowrap' }}>Labour ({currencySymbol.trim()})</th>
          <th style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #334155', fontSize: '8.5px', whiteSpace: 'nowrap' }}>Total Supply ({currencySymbol.trim()})</th>
          <th style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #334155', fontSize: '8.5px', whiteSpace: 'nowrap' }}>Total Labour ({currencySymbol.trim()})</th>
          <th style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', fontSize: '8.5px', backgroundColor: '#1e293b', whiteSpace: 'nowrap' }}>Total ({currencySymbol.trim()})</th>
        </tr>
      </thead>
      <tbody>
        {chunkItems.map((item, localIdx) => {
          const globalIdx = startIndex + localIdx;
          const qty = parseFloat(item.quantity) || 0;
          const supplyRate = parseFloat(item.rate) || 0;
          const laborRate = parseFloat(item.laborRate) || 0;
          const lineSupplyTotal = qty * supplyRate;
          const lineLaborTotal = qty * laborRate;
          const lineCombinedTotal = lineSupplyTotal + lineLaborTotal;
          const hasHsn = Boolean(item.hsnCode && item.hsnCode.trim() && item.hsnCode.trim() !== '-');

          return (
            <tr
              key={globalIdx}
              style={{
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: globalIdx % 2 === 1 ? '#f8fafc' : '#ffffff',
                pageBreakInside: 'avoid'
              }}
            >
              <td style={{ padding: '6px 2px', textAlign: 'center', verticalAlign: 'middle', lineHeight: '14px', borderRight: '1px solid #e2e8f0', color: '#64748b' }}>
                {globalIdx + 1}
              </td>
              <td style={{ padding: '6px 6px', verticalAlign: 'middle', lineHeight: '14px', borderRight: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {(() => {
                    const itemImg = item.imageUrl || products.find((p) => (p.id && p.id === item.productId) || (p._id && p._id === item.productId))?.imageUrl;
                    if (!itemImg) return null;
                    return (
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          minWidth: '42px',
                          minHeight: '42px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          overflow: 'hidden',
                          padding: '1px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                        }}
                      >
                        <img
                          src={itemImg}
                          alt=""
                          crossOrigin="anonymous"
                          style={{ maxWidth: '38px', maxHeight: '38px', width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>
                    );
                  })()}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '9.5px', lineHeight: '14px' }}>{item.name}</div>
                    {(item.make || hasHsn) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '2px', lineHeight: '12px' }}>
                        {item.make && (
                          <span style={{ fontSize: '8.5px', color: '#B3261E', fontWeight: 'bold', letterSpacing: '0.2px' }}>
                            Make: {item.make}
                          </span>
                        )}
                        {hasHsn && (
                          <span style={{ fontSize: '8px', color: '#475569', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                            HSN/SAC: {item.hsnCode}
                          </span>
                        )}
                      </div>
                    )}
                    {item.description && (
                      <div style={{ fontSize: '8px', color: '#475569', marginTop: '2px', lineHeight: '11px' }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td style={{ padding: '6px 2px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle', lineHeight: '14px', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                {item.quantity}
              </td>
              <td style={{ padding: '6px 2px', textAlign: 'center', verticalAlign: 'middle', lineHeight: '14px', borderRight: '1px solid #e2e8f0', color: '#475569', whiteSpace: 'nowrap' }}>
                {item.unit || 'Nos'}
              </td>
              <td style={{ padding: '6px 5px', textAlign: 'right', verticalAlign: 'middle', lineHeight: '14px', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap', fontWeight: 500 }}>
                {formatCurrency(supplyRate, false, currCode)}
              </td>
              <td style={{ padding: '6px 5px', textAlign: 'right', verticalAlign: 'middle', lineHeight: '14px', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap', color: '#1e293b' }}>
                {laborRate > 0 ? formatCurrency(laborRate, false, currCode) : '-'}
              </td>
              <td style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'middle', lineHeight: '14px', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap', color: '#0f172a' }}>
                {formatCurrency(lineSupplyTotal, false, currCode)}
              </td>
              <td style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'middle', lineHeight: '14px', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap', color: '#059669' }}>
                {formatCurrency(lineLaborTotal, false, currCode)}
              </td>
              <td style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'middle', lineHeight: '14px', whiteSpace: 'nowrap', color: '#0f172a', backgroundColor: '#f1f5f9' }}>
                {formatCurrency(lineCombinedTotal, false, currCode)}
              </td>
            </tr>
          );
        })}
      </tbody>
      {isLastPage && (
        <tfoot>
          <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1', fontWeight: 'bold', fontSize: '9.5px', color: '#0f172a' }}>
            <td colSpan={2} style={{ padding: '6px 8px', textAlign: 'left', borderRight: '1px solid #cbd5e1' }}>
              Total: {items.length} {items.length === 1 ? 'Item' : 'Items'}
            </td>
            <td style={{ padding: '6px 2px', textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>
              {items.reduce((s, it) => s + (parseFloat(it.quantity) || 0), 0)}
            </td>
            <td colSpan={3} style={{ textAlign: 'right', padding: '6px 8px', borderRight: '1px solid #cbd5e1', color: '#475569' }}>
              Total:
            </td>
            <td style={{ padding: '6px 6px', textAlign: 'right', borderRight: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 'bold' }}>
              {formatCurrency(materialTotal, false, currCode)}
            </td>
            <td style={{ padding: '6px 6px', textAlign: 'right', borderRight: '1px solid #cbd5e1', color: '#059669', fontWeight: 'bold' }}>
              {formatCurrency(laborTotal, false, currCode)}
            </td>
            <td style={{ padding: '6px 6px', textAlign: 'right', color: '#0f172a', fontWeight: '800', backgroundColor: '#e2e8f0' }}>
              {formatCurrency(subtotal, false, currCode)}
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );

  // Helper to render final closeout block (Financial Summary + Terms + Signatory)
  const renderCloseoutBlock = () => (
    <div className="quotation-closeout-block" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', width: '100%' }}>
      {/* Financial Summary & Settlement Details */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '48%' }} />
          <col style={{ width: '52%' }} />
        </colgroup>
        <tbody>
          <tr>
            {/* Left: Words & Bank Wire Details (48%) */}
            <td style={{ width: '48%', verticalAlign: 'top', paddingRight: '8px' }}>
              <div
                style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  marginBottom: showBankDetails ? '6px' : '0'
                }}
              >
                <div style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', color: '#1e40af', letterSpacing: '0.3px' }}>
                  AMOUNT IN WORDS ({currCode})
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '9.5px', marginTop: '2px', color: '#0f172a', lineHeight: '14px', fontStyle: 'italic' }}>
                  {amountInWords(grandTotal, currCode)}
                </div>
              </div>

              {showBankDetails && (
                <div
                  style={{
                    border: '1px dashed #93c5fd',
                    backgroundColor: '#f8fafc',
                    padding: '5px 7px',
                    borderRadius: '3px',
                    fontSize: '8.5px',
                    lineHeight: '13px'
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '2px' }}>
                    Direct RTGS / NEFT Wire Settlement Details:
                  </div>
                  <div><strong>Beneficiary:</strong> {activeCompany.name || 'POCIKA FIRE AND SAFETY PRODUCTS LLP'}</div>
                  <div><strong>Bank Name:</strong> {activeCompany.bankName || 'HDFC Bank Ltd.'} | <strong>A/C:</strong> {activeCompany.accountNo || '50200084605648'}</div>
                  <div>
                    <strong>IFSC:</strong> {activeCompany.ifsc || 'HDFC0000256'} | <strong>Branch:</strong> {activeCompany.branch || 'Ring Road, Surat, Gujarat'}
                  </div>
                  {activeCompany.upiId && <div><strong>UPI ID:</strong> {activeCompany.upiId}</div>}
                </div>
              )}
            </td>

            {/* Right: Totals Table (52%) */}
            <td style={{ width: '52%', verticalAlign: 'top' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '9.5px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '3px',
                  tableLayout: 'fixed'
                }}
              >
                <colgroup>
                  <col style={{ width: '55%' }} />
                  <col style={{ width: '45%' }} />
                </colgroup>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '3.5px 6px', color: '#0f172a', fontWeight: 'bold' }}>Gross Subtotal:</td>
                    <td style={{ padding: '3.5px 6px', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {formatCurrency(subtotal, true, currCode)}
                    </td>
                  </tr>
                  {totalDiscount > 0 && (
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '3.5px 6px', color: '#475569' }}>
                        Trade Discount {overallDiscountPercent > 0 ? `(${overallDiscountPercent}%):` : ':'}
                      </td>
                      <td style={{ padding: '3.5px 6px', textAlign: 'right', color: '#dc2626', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        - {formatCurrency(totalDiscount, true, currCode)}
                      </td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f1f5f9' }}>
                    <td style={{ padding: '3.5px 6px', fontWeight: 'bold', color: '#0f172a' }}>Net Taxable Value:</td>
                    <td style={{ padding: '3.5px 6px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {formatCurrency(totalTaxable, true, currCode)}
                    </td>
                  </tr>

                  {!isInterState ? (
                    <>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '3.5px 6px', color: '#475569' }}>{cgstLabel}</td>
                        <td style={{ padding: '3.5px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(cgstAmount, true, currCode)}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '3.5px 6px', color: '#475569' }}>{sgstLabel}</td>
                        <td style={{ padding: '3.5px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(sgstAmount, true, currCode)}</td>
                      </tr>
                    </>
                  ) : (
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '3.5px 6px', color: '#475569' }}>{igstLabel}</td>
                      <td style={{ padding: '3.5px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(igstAmount, true, currCode)}</td>
                    </tr>
                  )}

                  {roundOff !== 0 && (
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '3.5px 6px', color: '#475569' }}>Round Off:</td>
                      <td style={{ padding: '3.5px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {roundOff > 0 ? `+ ${currencySymbol.trim()} ${Number(roundOff).toFixed(currCfg.decimals)}` : `- ${currencySymbol.trim()} ${Math.abs(Number(roundOff)).toFixed(currCfg.decimals)}`}
                      </td>
                    </tr>
                  )}

                  <tr style={{ borderTop: '2px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a' }}>
                    <td style={{ padding: '5px 6px', fontSize: '9.5px', fontWeight: 'bold' }}>
                      TOTAL ({currCode}):
                    </td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap', color: '#0f172a' }}>
                      {formatCurrency(grandTotal, true, currCode)}
                    </td>
                  </tr>

                  {currCode !== 'INR' && (
                    <tr style={{ borderTop: '1px dashed #cbd5e1', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '8.5px' }}>
                      <td style={{ padding: '3px 6px' }}>
                        Reporting Equivalent (@ 1 {currCode} = ₹{exchangeRate}):
                      </td>
                      <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap' }}>
                        ₹ {(grandTotal * exchangeRate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Terms & Conditions & Authorized Signatory Box */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #cbd5e1',
          borderRadius: '4px',
          marginBottom: '6px',
          tableLayout: 'fixed'
        }}
      >
        <colgroup>
          <col style={{ width: '58%' }} />
          <col style={{ width: '42%' }} />
        </colgroup>
        <tbody>
          <tr>
            {/* Commercial Terms (58%) */}
            <td style={{ width: '58%', padding: '7px 9px', verticalAlign: 'top', borderRight: '1px solid #cbd5e1' }}>
              <div style={{ fontWeight: 'bold', fontSize: '9.5px', marginBottom: '2px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
                Terms &amp; Conditions:
              </div>
              {paymentTermsNote && (
                <div style={{ fontSize: '9.5px', color: '#1e293b', marginBottom: '2px', lineHeight: '15px' }}>
                  <strong>Payment Terms:</strong> {paymentTermsNote}
                </div>
              )}
              <ol style={{ paddingLeft: '16px', margin: 0, fontSize: '9.5px', color: '#475569', lineHeight: '15px' }}>
                {termsToDisplay.map((term, i) => (
                  <li key={i} style={{ marginBottom: '1px' }}>
                    {term}
                  </li>
                ))}
              </ol>
            </td>

            {/* Authorized Signatory (44%) - Prominent realistic physical stamp & signature box */}
            <td style={{ width: '44%', padding: '6px 12px', verticalAlign: 'bottom', textAlign: 'center' }}>
              {showSignature ? (
                <div>
                  {activeCompany.signatureUrl ? (
                    <div style={{ minHeight: `${sealBoxHeight}px`, height: `${sealBoxHeight}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px', overflow: 'hidden' }}>
                      <img
                        src={activeCompany.signatureUrl}
                        alt="Signature & Seal"
                        style={{
                          maxHeight: `${sealBoxHeight}px`,
                          maxWidth: '250px',
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain',
                          margin: '0 auto',
                          display: 'block',
                          transform: `scale(${sealImageScale})`,
                          transformOrigin: 'center center',
                          filter: 'contrast(1.10)'
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ height: `${sealBoxHeight}px` }} />
                  )}
                  <div style={{ borderTop: '2px solid #0f172a', paddingTop: '4px', fontWeight: 'bold', fontSize: '10px', color: '#0f172a', lineHeight: '13px', letterSpacing: '0.2px' }}>
                    {activeCompany.signatoryTitle || 'Authorized Signatory'}
                  </div>
                  <div style={{ fontSize: '8.5px', color: '#475569', marginTop: '1px', lineHeight: '11px', fontWeight: 600 }}>
                    For {activeCompany.name || 'POCIKA FIRE AND SAFETY PRODUCTS LLP'}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ height: '70px' }} />
                  <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '4px', fontSize: '9px', color: '#64748b', fontWeight: 600 }}>
                    Authorized Signatory &amp; Company Seal
                  </div>
                  <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '1px' }}>
                    For {activeCompany.name || 'POCIKA FIRE AND SAFETY PRODUCTS LLP'}
                  </div>
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  // Helper to render corporate footnote
  const renderFooter = (pageIndex, totalPagesCount) => (
    <div
      className="quotation-footnote"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid #cbd5e1',
        paddingTop: '6px',
        marginTop: '8px',
        fontSize: '8.5px',
        color: '#475569',
        letterSpacing: '0.15px',
        lineHeight: '13px',
        whiteSpace: 'nowrap'
      }}
    >
      <div style={{ flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
        {footerText}
      </div>
      <div
        style={{
          textAlign: 'right',
          whiteSpace: 'nowrap',
          marginLeft: '12px',
          fontWeight: 700,
          fontSize: '8.5px',
          padding: '2px 8px'
        }}
      >
        Authorized Quotation
      </div>
    </div>
  );

  return (
    <div id={id} className="quotation-document" style={{ width: '100%', maxWidth: '760px', margin: '0 auto' }}>
      {pages.map((chunk, pageIndex) => {
        const isLastPage = pageIndex === totalPages - 1;
        const startIndex = pages.slice(0, pageIndex).reduce((sum, p) => sum + p.length, 0);
        return (
          <div
            key={pageIndex}
            className="quotation-page"
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              padding: '16px 20px',
              fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
              fontSize: '10px',
              lineHeight: '14px',
              boxSizing: 'border-box',
              width: '100%',
              maxWidth: '760px',
              margin: '0 auto 24px auto',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 'auto',
              position: 'relative'
            }}
          >
            <div className="quotation-page-top" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {!hideHeaderFooter && renderHeader(pageIndex, totalPages)}
              {renderItemsTable(chunk, startIndex, isLastPage)}
              {/* Flexible spacer pushes closeout block to bottom right above footer */}
              {isLastPage && <div style={{ flex: '1 1 auto', minHeight: '12px' }} />}
              {isLastPage && renderCloseoutBlock()}
            </div>
            {!hideHeaderFooter && renderFooter(pageIndex, totalPages)}
          </div>
        );
      })}
    </div>
  );
}
