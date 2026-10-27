import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { QuotationDocument } from './QuotationDocument';
import { generateQuotationPDF } from '../../utils/pdfGenerator';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Printer, Download, Loader2, Lock } from 'lucide-react';

export function QuotationPreviewModal({
  isOpen,
  onClose,
  quotationData,
  calculatedTotals,
  company
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { success, error, info } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  if (!quotationData) return null;

  // Build combined payload
  const fullQuotation = {
    ...quotationData,
    totals: calculatedTotals || quotationData.totals || {}
  };

  const isApproved = fullQuotation.status === 'Approved' || fullQuotation.status === 'Accepted';
  const isDownloadLocked = !isAdmin && !isApproved;

  const [includeDigitalSignature, setIncludeDigitalSignature] = useState(true);

  const handlePrint = () => {
    if (isDownloadLocked) {
      error('Approval Required', 'PDF Print is locked until Admin approves this quotation.');
      return;
    }
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (isDownloadLocked) {
      error('Approval Required', 'PDF Download is locked until Admin approves this quotation.');
      return;
    }
    try {
      setIsGeneratingPDF(true);
      info('Generating PDF', 'Generating server-side PDF via Puppeteer...');
      await generateQuotationPDF(null, fullQuotation);
      success('PDF Downloaded', `Saved as ${fullQuotation.quotationNo || 'Quotation'}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      error('PDF Generation Failed', err.message || 'An error occurred while exporting PDF.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Quotation Preview — ${fullQuotation.quotationNo || 'Draft'}`}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="flex items-center gap-12">
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                userSelect: 'none',
                color: 'var(--color-text)',
                fontWeight: 500
              }}
              title="Uncheck if printing on paper to apply physical rubber stamp and manual pen signature"
            >
              <input
                type="checkbox"
                checked={includeDigitalSignature}
                onChange={(e) => setIncludeDigitalSignature(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
              />
              <span>Digital Stamp &amp; Seal</span>
            </label>
            {isDownloadLocked ? (
              <Badge variant="warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Lock size={12} /> Pending Admin Approval (Download Locked)
              </Badge>
            ) : (
              <Badge variant="success">Print &amp; PDF Ready</Badge>
            )}
          </div>
          <div className="flex items-center gap-8" style={{ flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              icon={isGeneratingPDF ? Loader2 : isDownloadLocked ? Lock : Download}
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF || isDownloadLocked}
              title={isDownloadLocked ? 'Locked until Admin approves' : 'Download PDF'}
            >
              {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button
              variant="secondary"
              icon={isDownloadLocked ? Lock : Printer}
              onClick={handlePrint}
              disabled={isDownloadLocked}
              title={isDownloadLocked ? 'Locked until Admin approves' : 'Print'}
            >
              Print
            </Button>
            <Button variant="primary" onClick={onClose}>
              Close Preview
            </Button>
          </div>
        </div>
      }
    >
      <QuotationDocument
        id="quotation-modal-preview-doc"
        quotation={fullQuotation}
        company={company}
        includeDigitalSignature={includeDigitalSignature}
      />
    </Modal>
  );
}
