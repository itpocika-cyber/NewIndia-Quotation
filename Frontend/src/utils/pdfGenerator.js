import React from 'react';
import ReactDOM from 'react-dom/client';
import html2pdf from 'html2pdf.js';
import { api } from '../services/api';
import { QuotationDocument } from '../pages/quotation/QuotationDocument';

/**
 * Sanitizes customer or company string to be safe for filenames across operating systems.
 */
export function sanitizeFilename(str) {
  if (!str) return 'Customer';
  return str
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 40);
}

/**
 * High-fidelity client-side PDF renderer using html2pdf.js
 * Automatically activates whenever the backend PDF engine (Puppeteer) is unavailable or encounters server errors on cloud hosts like Render.
 */
async function generateClientSidePdf(element, quotation, filename) {
  let stagingElement = element;
  let unmountStaging = null;
  let containerToRemove = null;

  // 1. Locate existing rendered QuotationDocument in DOM if available
  if (!stagingElement) {
    stagingElement =
      document.getElementById('quotation-modal-preview-doc') ||
      document.getElementById('quotation-print-doc') ||
      document.getElementById('quotation-printable-doc');
  }

  // 2. If no matching element found in DOM, mount QuotationDocument in an isolated off-screen staging container
  if (!stagingElement) {
    const mountContainer = document.createElement('div');
    mountContainer.id = 'pdf-headless-mount';
    mountContainer.style.position = 'fixed';
    mountContainer.style.top = '-9999px';
    mountContainer.style.left = '-9999px';
    mountContainer.style.width = '794px';
    mountContainer.style.zIndex = '-9999';
    mountContainer.style.opacity = '0';
    mountContainer.style.pointerEvents = 'none';
    document.body.appendChild(mountContainer);
    containerToRemove = mountContainer;

    const root = ReactDOM.createRoot(mountContainer);
    root.render(
      React.createElement(QuotationDocument, {
        quotation,
        company: quotation.companySnapshot || {}
      })
    );
    unmountStaging = () => {
      try {
        root.unmount();
      } catch (e) {
        // Ignore unmount edge case
      }
    };

    // Allow DOM to layout styles and images
    await new Promise((resolve) => setTimeout(resolve, 350));
    stagingElement = mountContainer.firstElementChild || mountContainer;
  }

  // 3. Create isolated 794px staging wrapper (matching standard 210mm A4 width at 96 DPI)
  const stagingWrapper = document.createElement('div');
  stagingWrapper.style.position = 'fixed';
  stagingWrapper.style.top = '0';
  stagingWrapper.style.left = '0';
  stagingWrapper.style.width = '794px';
  stagingWrapper.style.backgroundColor = '#ffffff';
  stagingWrapper.style.zIndex = '-9999';
  stagingWrapper.style.opacity = '0.001';
  stagingWrapper.style.pointerEvents = 'none';

  const clone = stagingElement.cloneNode(true);
  clone.style.width = '794px';
  clone.style.maxWidth = '794px';
  clone.style.boxSizing = 'border-box';
  clone.style.margin = '0';
  clone.style.padding = '20px 24px';
  clone.style.border = 'none';
  clone.style.borderRadius = '0';
  clone.style.webkitFontSmoothing = 'antialiased';

  stagingWrapper.appendChild(clone);
  document.body.appendChild(stagingWrapper);

  const opt = {
    margin: [0, 0, 0, 0],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      dpi: 300,
      letterRendering: false,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollY: 0,
      scrollX: 0,
      windowWidth: 794
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
      precision: 16
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy']
    }
  };

  try {
    await html2pdf().set(opt).from(clone).save();
  } finally {
    if (stagingWrapper.parentNode) {
      stagingWrapper.parentNode.removeChild(stagingWrapper);
    }
    if (unmountStaging) {
      unmountStaging();
    }
    if (containerToRemove && containerToRemove.parentNode) {
      containerToRemove.parentNode.removeChild(containerToRemove);
    }
  }
}

/**
 * Generates and downloads a corporate A4 PDF.
 * Tries server-side Puppeteer first; seamlessly falls back to client-side html2pdf if the server encounters errors (e.g. Render Chromium issues).
 *
 * @param {HTMLElement|null} element - Optional DOM element reference
 * @param {Object} quotation - Quotation data containing quotationNo, customer, items, etc.
 * @returns {Promise<void>}
 */
export async function generateQuotationPDF(element, quotation) {
  if (!quotation) {
    throw new Error('Quotation data not provided for PDF generation');
  }

  const quotationNo = quotation.quotationNo || 'Quotation';
  const customerName = sanitizeFilename(quotation.customer?.name || 'Customer');
  const filename = `${quotationNo}-${customerName}.pdf`;

  let serverSuccess = false;

  // 1. Attempt server-side direct PDF stream: GET /api/v1/quotations/:id/pdf
  if (quotation._id || (quotationNo && quotationNo !== 'Draft' && quotationNo !== 'Quotation')) {
    try {
      await api.quotations.downloadPdf(quotation._id || quotationNo, filename);
      serverSuccess = true;
      return;
    } catch (err) {
      console.warn('Backend GET /pdf endpoint unavailable, trying fallback POST /render-pdf:', err.message);
    }
  }

  // 2. Attempt server-side ad-hoc rendering: POST /api/v1/quotations/render-pdf
  if (!serverSuccess) {
    try {
      await api.quotations.renderPdfFromData(quotation, filename);
      serverSuccess = true;
      return;
    } catch (err) {
      console.warn('Backend POST /render-pdf failed, activating client-side PDF renderer fallback:', err.message);
    }
  }

  // 3. Fallback: generate PDF directly inside the browser so download never fails
  await generateClientSidePdf(element, quotation, filename);
}
