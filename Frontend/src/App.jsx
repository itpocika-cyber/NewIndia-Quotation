import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MastersProvider } from './context/MastersContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/auth/Login';

// Pages
import { Dashboard } from './pages/dashboard/Dashboard';
import { Reports } from './pages/reports/Reports';
import { ActivityLog } from './pages/activity/ActivityLog';

// Quotations
import { CreateQuotation } from './pages/quotation/CreateQuotation';
import { QuotationList } from './pages/quotation/QuotationList';

import { Settings } from './pages/settings/Settings';
import { AuthorizedUsers } from './pages/users/AuthorizedUsers';

// Masters
import { CompanyMaster } from './pages/masters/CompanyMaster';
import { CustomerMaster } from './pages/masters/CustomerMaster';
import { ProductMaster } from './pages/masters/ProductMaster';
import { CategoryMaster } from './pages/masters/CategoryMaster';
import { UnitMaster } from './pages/masters/UnitMaster';
import { TaxMaster } from './pages/masters/TaxMaster';
import { PaymentTermsMaster } from './pages/masters/PaymentTermsMaster';
import { TermsConditionsMaster } from './pages/masters/TermsConditionsMaster';

import { PrintQuotation } from './pages/quotation/PrintQuotation';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255,255,255,0.1)',
              borderTopColor: '#e53e3e',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px'
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.02em' }}>POCIKA QUOTATION</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Connecting to secure backend...</div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        {/* Dedicated Print & PDF generation routes (Standalone A4 layout without sidebar/header) */}
        <Route path="/print/quotation/:id" element={<PrintQuotation />} />
        <Route path="/quotation/:id/print" element={<PrintQuotation />} />

        {!isAuthenticated ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="quotations" element={<QuotationList />} />
              <Route path="quotations/create" element={<CreateQuotation />} />
              <Route path="reports" element={<Reports />} />
              <Route path="activity" element={<ActivityLog />} />
              <Route path="users" element={<AuthorizedUsers />} />
              <Route path="settings" element={<Settings />} />

              {/* Masters */}
              <Route path="masters/company" element={<Settings />} />
              <Route path="masters/customers" element={<CustomerMaster />} />
              <Route path="masters/products" element={<ProductMaster />} />
              <Route path="masters/categories" element={<CategoryMaster />} />
              <Route path="masters/units" element={<UnitMaster />} />
              <Route path="masters/taxes" element={<TaxMaster />} />
              <Route path="masters/payment-terms" element={<PaymentTermsMaster />} />
              <Route path="masters/terms-conditions" element={<TermsConditionsMaster />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </>
        )}
      </Routes>
    </ErrorBoundary>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MastersProvider>
          <BrowserRouter 
            basename={import.meta.env.BASE_URL}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <AppContent />
          </BrowserRouter>
        </MastersProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
