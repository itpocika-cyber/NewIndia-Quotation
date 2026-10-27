import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { QuotationDocument } from './QuotationDocument';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Lock } from 'lucide-react';

export function PrintQuotation() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || localStorage.getItem('pocika_auth_token');
  const isPuppeteer = searchParams.get('puppeteer') === 'true';

  const [quotation, setQuotation] = useState(null);
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [includeDigitalSignature, setIncludeDigitalSignature] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem('pocika_auth_token', token);
    }

    async function fetchQuotation() {
      try {
        setIsLoading(true);

        // Fetch quotation by id or quotationNo
        const qData = await api.quotations.getById(id);
        setQuotation(qData);

        // Company data
        if (qData.companySnapshot && qData.companySnapshot.name) {
          setCompany(qData.companySnapshot);
        } else {
          const compData = await api.masters.getCompany().catch(() => null);
          if (compData) {
            setCompany(compData);
          }
        }
      } catch (err) {
        console.error('Error loading print quotation:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      fetchQuotation();
    }
  }, [id, token]);

  if (isLoading) {
    return (
      <div
        id="print-loading"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'Arial, sans-serif',
          color: '#64748b',
          fontSize: '14px'
        }}
      >
        Loading quotation document for print...
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div
        id="print-error"
        style={{
          padding: '24px',
          fontFamily: 'Arial, sans-serif',
          color: '#dc2626',
          fontSize: '14px'
        }}
      >
        <strong>Failed to load quotation:</strong> {error || 'Quotation not found'}
      </div>
    );
  }

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isApproved = quotation?.status === 'Approved' || quotation?.status === 'Accepted' || quotation?.status === 'Sent';
  const isPrintLocked = !isPuppeteer && !isAdmin && !isApproved;

  return (
    <div
      id="print-page-wrapper"
      data-ready="true"
      style={{
        backgroundColor: '#ffffff',
        minHeight: '100vh',
        padding: isPuppeteer ? '0' : '20px 10px',
        margin: '0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      {isPuppeteer && (
        <style>{`
          @page {
            size: A4 portrait;
            margin-top: 30mm !important;
            margin-bottom: 12mm !important;
            margin-left: 10mm !important;
            margin-right: 10mm !important;
          }
        `}</style>
      )}
      {!isPuppeteer && (
        <div
          className="no-print"
          style={{
            width: '100%',
            maxWidth: '760px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '10px 16px',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#0f172a' }}>
              Quotation Print Preview — {quotation.quotationNo || 'Draft'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2 }}>
              A4 Executive Document layout
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isPrintLocked ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#b45309',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde68a',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                <Lock size={13} /> Print Locked: Requires Admin Approval First
              </span>
            ) : (
              <>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: '#334155'
                  }}
                  title="Uncheck if printing on paper to apply physical rubber stamp and manual pen signature"
                >
                  <input
                    type="checkbox"
                    checked={includeDigitalSignature}
                    onChange={(e) => setIncludeDigitalSignature(e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: '#0f172a' }}
                  />
                  <span>Digital Stamp &amp; Signature</span>
                </label>

                <button
                  onClick={() => window.print()}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '12px'
                  }}
                >
                  Print / Save PDF
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '760px' }}>
        <QuotationDocument
          quotation={quotation}
          company={company}
          hideHeaderFooter={isPuppeteer}
          includeDigitalSignature={includeDigitalSignature}
          id="quotation-print-doc"
        />
      </div>
    </div>
  );
}
