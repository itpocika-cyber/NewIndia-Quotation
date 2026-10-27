import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { exportToJSON } from '../utils/exportUtils';
import {
  SEED_COMPANY,
  SEED_CUSTOMERS,
  SEED_PRODUCTS,
  SEED_CATEGORIES,
  SEED_UNITS,
  SEED_TAXES,
  SEED_PAYMENT_TERMS,
  SEED_TERMS_CONDITIONS,
  SEED_QUOTATIONS,
  SEED_ACTIVITY_LOGS
} from '../data/seedData';

export const DEFAULT_SETTINGS = {
  quotationPrefix: 'QT',
  quotationStartNumber: 1,
  quotationYearFormat: 'YYYY',
  defaultValidityDays: 30,
  currencySymbol: '₹',
  decimalPrecision: 2,
  showBankDetailsOnPDF: true,
  showSignatureOnPDF: true,
  signatureSealHeight: 170,
  signatureSealScale: 1.15,
  customFooterText: 'Thank you for your business! | This is a Computer Generated Quotation | Regd. Office: Surat, Gujarat | Subject to Surat Jurisdiction.'
};

const CURRENT_DATA_VERSION = 'pocika_surat_mongo_v1';
const MastersContext = createContext(null);

export function MastersProvider({ children }) {
  const { isAuthenticated, user } = useAuth();

  // Initial state with defaults
  const [company, setCompany] = useState(SEED_COMPANY);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(SEED_CATEGORIES);
  const [units, setUnits] = useState(SEED_UNITS);
  const [taxes, setTaxes] = useState(SEED_TAXES);
  const [paymentTerms, setPaymentTerms] = useState(SEED_PAYMENT_TERMS);
  const [termsConditions, setTermsConditions] = useState(SEED_TERMS_CONDITIONS);
  const [quotations, setQuotations] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real backend data once authenticated
  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.masters.getAll();
      if (res) {
        if (res.company) setCompany(res.company);
        if (res.settings) setSettings(res.settings);
        if (Array.isArray(res.customers)) setCustomers(res.customers);
        if (Array.isArray(res.products)) {
          setProducts(res.products.map((p) => ({ ...p, make: p.make || 'POCIKA' })));
        }
        if (Array.isArray(res.categories) && res.categories.length > 0) {
          setCategories(res.categories);
        }
        if (Array.isArray(res.units) && res.units.length > 0) {
          setUnits(res.units);
        }
        if (Array.isArray(res.taxes) && res.taxes.length > 0) {
          setTaxes(res.taxes);
        }
        if (Array.isArray(res.paymentTerms) && res.paymentTerms.length > 0) {
          setPaymentTerms(res.paymentTerms);
        }
        if (Array.isArray(res.termsConditions) && res.termsConditions.length > 0) {
          setTermsConditions(res.termsConditions);
        }
        if (Array.isArray(res.quotations)) setQuotations(res.quotations);
        if (Array.isArray(res.activityLogs)) setActivityLogs(res.activityLogs);
      }
    } catch (err) {
      console.error('Failed to load initial masters from backend:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Async API Wrappers
  const updateCompany = async (updatedCompany) => {
    const data = await api.masters.updateCompany(updatedCompany);
    setCompany(data);
    await logActivity('COMPANY', 'SETTINGS_UPDATED', '', '', 'Company profile updated.');
    return data;
  };

  const updateSettings = async (newSettings) => {
    const merged = { ...settings, ...newSettings };
    const data = await api.masters.updateSettings(merged);
    setSettings(data);
    await logActivity('SETTINGS', 'SETTINGS_UPDATED', '', '', 'System configurations updated.');
    return data;
  };

  // Customers
  const addCustomer = async (customerData) => {
    const newCustomer = await api.masters.createCustomer(customerData);
    setCustomers((prev) => [newCustomer, ...prev]);
    await logActivity(newCustomer.name, 'CUSTOMER_ADDED', '', '', `Added new customer ${newCustomer.name}.`);
    return newCustomer;
  };

  const updateCustomer = async (id, updatedData) => {
    const updated = await api.masters.updateCustomer(id, updatedData);
    setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
    await logActivity(updated.name, 'CUSTOMER_UPDATED', '', '', `Updated customer profile.`);
    return updated;
  };

  const deleteCustomer = async (id) => {
    await api.masters.deleteCustomer(id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    await logActivity(id, 'CUSTOMER_DELETED', '', '', `Deleted customer record.`);
  };

  // Products
  const addProduct = async (productData) => {
    const newProduct = await api.masters.createProduct(productData);
    setProducts((prev) => [newProduct, ...prev]);
    await logActivity(newProduct.name, 'PRODUCT_ADDED', '', '', `Added new product ${newProduct.name}.`);
    return newProduct;
  };

  const updateProduct = async (id, updatedData) => {
    const updated = await api.masters.updateProduct(id, updatedData);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    await logActivity(updated.name, 'PRODUCT_UPDATED', '', '', `Updated product item.`);
    return updated;
  };

  const deleteProduct = async (id) => {
    await api.masters.deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    await logActivity(id, 'PRODUCT_DELETED', '', '', `Deleted product record.`);
  };

  // Categories
  const addCategory = async (categoryData) => {
    const newCat = await api.masters.addCategory(categoryData);
    setCategories((prev) => [...prev, newCat]);
    return newCat;
  };
  const updateCategory = async (id, updatedData) => {
    const updated = await api.masters.updateCategory(id, updatedData);
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };
  const deleteCategory = async (id) => {
    await api.masters.deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // Units
  const addUnit = async (unitData) => {
    const newUnit = await api.masters.addUnit(unitData);
    setUnits((prev) => [...prev, newUnit]);
    return newUnit;
  };
  const updateUnit = async (id, updatedData) => {
    const updated = await api.masters.updateUnit(id, updatedData);
    setUnits((prev) => prev.map((u) => (u.id === id ? updated : u)));
    return updated;
  };
  const deleteUnit = async (id) => {
    await api.masters.deleteUnit(id);
    setUnits((prev) => prev.filter((u) => u.id !== id));
  };

  // Taxes
  const addTax = async (taxData) => {
    const newTax = await api.masters.addTax(taxData);
    setTaxes((prev) => [...prev, newTax]);
    return newTax;
  };
  const updateTax = async (id, updatedData) => {
    const updated = await api.masters.updateTax(id, updatedData);
    setTaxes((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  };
  const deleteTax = async (id) => {
    await api.masters.deleteTax(id);
    setTaxes((prev) => prev.filter((t) => t.id !== id));
  };

  // Payment Terms
  const addPaymentTerm = async (termData) => {
    const newTerm = await api.masters.addPaymentTerm(termData);
    setPaymentTerms((prev) => [...prev, newTerm]);
    return newTerm;
  };
  const updatePaymentTerm = async (id, updatedData) => {
    const updated = await api.masters.updatePaymentTerm(id, updatedData);
    setPaymentTerms((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  };
  const deletePaymentTerm = async (id) => {
    await api.masters.deletePaymentTerm(id);
    setPaymentTerms((prev) => prev.filter((t) => t.id !== id));
  };

  // Terms & Conditions
  const addTermCondition = async (termData) => {
    const newTerm = await api.masters.addTermCondition(termData);
    setTermsConditions((prev) => [...prev, newTerm]);
    return newTerm;
  };
  const updateTermCondition = async (id, updatedData) => {
    const updated = await api.masters.updateTermCondition(id, updatedData);
    setTermsConditions((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  };
  const deleteTermCondition = async (id) => {
    await api.masters.deleteTermCondition(id);
    setTermsConditions((prev) => prev.filter((t) => t.id !== id));
  };

  // Quotations
  const getNextQuotationNumber = async () => {
    // Standard professional prefix: POC-QT- (or configured prefix in Settings)
    const customPrefix = settings.quotationPrefix ? settings.quotationPrefix.trim() : 'POC-QT';
    const cleanPrefix = customPrefix.endsWith('-') ? customPrefix : `${customPrefix}-`;

    let yearPart = '';
    const now = new Date();
    if (settings.quotationYearFormat === 'YYYY') {
      yearPart = `${now.getFullYear()}-`;
    } else if (settings.quotationYearFormat === 'YY') {
      yearPart = `${String(now.getFullYear()).slice(-2)}-`;
    } // 'NONE' leaves yearPart empty for clean format e.g. POC-QT-0001

    const finalPrefix = `${cleanPrefix}${yearPart}`;
    return await api.quotations.getNextNumber(finalPrefix);
  };

  // Helper to extract 2-letter staff initials (e.g., "Devrajsinh Solanki" -> "DS", "Jaydip Pipariya" -> "JP")
  const getStaffInitials = (name) => {
    if (!name) return 'DS';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0].replace(/[^a-zA-Z]/g, '')[0] || '';
      const second = parts[1].replace(/[^a-zA-Z]/g, '')[0] || '';
      const combined = `${first}${second}`.toUpperCase();
      if (combined.length === 2) return combined;
    }
    const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
    return clean.length >= 2 ? clean.substring(0, 2) : 'DS';
  };

  const generateInquiryNumber = async (customStaffName) => {
    const author = customStaffName || user?.name || user?.email || 'Devrajsinh Solanki';
    const initials = getStaffInitials(author);
    const prefix = `INQ-${initials}-`;
    return await api.quotations.getNextNumber(prefix);
  };

  const saveQuotation = async (quotationData, isDraft = false) => {
    const defaultAuthor = user?.name || user?.email || 'Pocika Staff';
    const payload = {
      ...quotationData,
      status: quotationData.status || (isDraft ? 'Draft' : 'Sent'),
      salesPerson: quotationData.salesPerson || quotationData.preparedBy || defaultAuthor,
      preparedBy: quotationData.preparedBy || quotationData.salesPerson || defaultAuthor,
      createdByName: quotationData.createdByName || defaultAuthor,
      companySnapshot: { ...company, settings: { ...settings } }
    };
    const saved = await api.quotations.save(payload);

    setQuotations((prev) => {
      const isExisting = prev.some((q) => q.quotationNo === saved.quotationNo);
      if (isExisting) return prev.map((q) => (q.quotationNo === saved.quotationNo ? saved : q));
      return [saved, ...prev];
    });

    await logActivity(saved.quotationNo, 'SAVED', '', saved.status, `Quotation saved.`);
    return saved;
  };

  const updateQuotationStatus = async (quotationNo, newStatus, note = '') => {
    await api.quotations.updateStatus(quotationNo, newStatus);
    setQuotations((prev) => prev.map((q) => (q.quotationNo === quotationNo ? { ...q, status: newStatus } : q)));
    await logActivity(quotationNo, 'STATUS_CHANGE', '', newStatus, note || `Status changed.`);
  };

  const deleteQuotation = async (quotationNo) => {
    await api.quotations.delete(quotationNo);
    setQuotations((prev) => prev.filter((q) => q.quotationNo !== quotationNo));
    await logActivity(quotationNo, 'DELETED', '', '', `Quotation deleted.`);
  };

  const duplicateQuotation = async (quotationNo) => {
    const source = quotations.find((q) => q.quotationNo === quotationNo);
    if (!source) throw new Error(`Quotation ${quotationNo} not found`);

    const newQuotationNo = await getNextQuotationNumber();
    const sourceCopy = JSON.parse(JSON.stringify(source));
    delete sourceCopy._id;
    delete sourceCopy.id;
    delete sourceCopy.__v;
    delete sourceCopy.createdAt;
    delete sourceCopy.updatedAt;

    // Sanitize item IDs to avoid collisions
    if (Array.isArray(sourceCopy.items)) {
      sourceCopy.items = sourceCopy.items.map((it, idx) => ({
        ...it,
        id: `row-${Date.now()}-${idx + 1}`
      }));
    }

    const duplicated = {
      ...sourceCopy,
      quotationNo: newQuotationNo,
      quotationDate: new Date().toISOString().split('T')[0],
      status: 'Draft',
      referenceNo: sourceCopy.referenceNo ? `${sourceCopy.referenceNo} (Copy)` : ''
    };
    return duplicated;
  };

  const createRevision = async (quotationNo) => {
    const source = quotations.find((q) => q.quotationNo === quotationNo);
    if (!source) throw new Error(`Quotation ${quotationNo} not found`);

    // Determine root baseQuotationNo
    // If quotationNo is already QT-2026-0009-R1, base is QT-2026-0009
    const baseQuotationNo = source.baseQuotationNo || source.quotationNo.replace(/-R\d+$/, '');
    
    // Find all existing revisions for this base
    const existingRevs = quotations.filter((q) => 
      q.quotationNo === baseQuotationNo || 
      q.baseQuotationNo === baseQuotationNo || 
      q.quotationNo.startsWith(`${baseQuotationNo}-R`)
    );
    
    let maxRev = 0;
    existingRevs.forEach((q) => {
      const match = q.quotationNo.match(/-R(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxRev) maxRev = num;
      }
    });

    const nextRevNum = maxRev + 1;
    const revisionQuotationNo = `${baseQuotationNo}-R${nextRevNum}`;
    const revisionLabel = `v${nextRevNum + 1} (R${nextRevNum})`;

    const sourceCopy = JSON.parse(JSON.stringify(source));
    delete sourceCopy._id;
    delete sourceCopy.id;
    delete sourceCopy.__v;
    delete sourceCopy.createdAt;
    delete sourceCopy.updatedAt;

    if (Array.isArray(sourceCopy.items)) {
      sourceCopy.items = sourceCopy.items.map((it, idx) => ({
        ...it,
        id: `row-${Date.now()}-${idx + 1}`
      }));
    }

    const previousHistory = Array.isArray(source.revisionHistory) ? [...source.revisionHistory] : [];
    previousHistory.push({
      version: source.version || 1,
      revisionLabel: source.revisionLabel || 'v1',
      quotationNo: source.quotationNo,
      date: source.quotationDate,
      items: JSON.parse(JSON.stringify(source.items || [])),
      totals: JSON.parse(JSON.stringify(source.totals || source.financials || {})),
      customer: JSON.parse(JSON.stringify(source.customer || {})),
      grandTotal: source.totals?.grandTotal || source.financials?.grandTotal || 0,
      revisedBy: user?.name || user?.email || 'Staff',
      revisedAt: new Date(),
      notes: `Revision R${nextRevNum} branched from ${source.quotationNo}`
    });

    const revisionObj = {
      ...sourceCopy,
      quotationNo: revisionQuotationNo,
      baseQuotationNo: baseQuotationNo,
      version: nextRevNum + 1,
      revisionLabel: revisionLabel,
      revisionHistory: previousHistory,
      quotationDate: new Date().toISOString().split('T')[0],
      status: 'Draft',
      referenceNo: sourceCopy.referenceNo || ''
    };

    return revisionObj;
  };

  const logActivity = async (quotationNo, action, oldStatus, newStatus, note) => {
    try {
      const newLog = await api.activity.log({
        quotationNo,
        action,
        oldStatus,
        newStatus,
        note,
        user: user?.name || user?.email || 'Pocika Staff'
      });
      setActivityLogs((prev) => [newLog, ...prev]);
      return newLog;
    } catch {
      // Non-blocking log activity
      return null;
    }
  };

  // System Functions: Export, Import, Reset
  const exportFullBackupJSON = () => {
    const today = new Date().toISOString().split('T')[0];
    const filename = `pocika_backup_${today}.json`;
    const payload = {
      version: CURRENT_DATA_VERSION,
      exportedAt: new Date().toISOString(),
      company,
      settings,
      customers,
      products,
      categories,
      units,
      taxes,
      paymentTerms,
      termsConditions,
      quotations,
      activityLogs
    };
    exportToJSON(filename, payload);
    return filename;
  };

  const importFullBackupJSON = async (backupData) => {
    await api.masters.importBackup(backupData);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const resetAllData = async () => {
    await api.masters.resetAll();
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  return (
    <MastersContext.Provider
      value={{
        isLoading,
        refreshData: loadData,
        company,
        updateCompany,
        settings,
        updateSettings,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        units,
        addUnit,
        updateUnit,
        deleteUnit,
        taxes,
        addTax,
        updateTax,
        deleteTax,
        paymentTerms,
        addPaymentTerm,
        updatePaymentTerm,
        deletePaymentTerm,
        termsConditions,
        addTermCondition,
        updateTermCondition,
        deleteTermCondition,
        quotations,
        saveQuotation,
        updateQuotationStatus,
        deleteQuotation,
        duplicateQuotation,
        createRevision,
        getNextQuotationNumber,
        generateInquiryNumber,
        activityLogs,
        logActivity,
        exportFullBackupJSON,
        importFullBackupJSON,
        resetAllData
      }}
    >
      {children}
    </MastersContext.Provider>
  );
}

export function useMasters() {
  const context = useContext(MastersContext);
  if (!context) throw new Error('useMasters must be used within a MastersProvider');
  return context;
}
