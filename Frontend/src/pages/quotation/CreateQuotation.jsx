import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { QuotationPreviewModal } from './QuotationPreviewModal';
import {
  Plus,
  Trash2,
  Eye,
  Save,
  FileCheck,
  Send,
  RotateCcw,
  UserPlus,
  CheckSquare,
  Square,
  AlertCircle,
  ArrowLeft,
  HelpCircle,
  Package,
  Search,
  X,
  ChevronDown,
  RefreshCw,
  Globe,
  Building2,
  MapPin,
  ShieldCheck,
  Users
} from 'lucide-react';
import { useMasters } from '../../context/MastersContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { calculateQuotationTotals, formatCurrency } from '../../utils/calculations';
import { amountInWords } from '../../utils/amountInWords';
import { SUPPORTED_CURRENCIES, CURRENCY_OPTIONS, getCurrencyConfig } from '../../constants/currencies';
import { COUNTRIES, INDIAN_STATES, getCountryConfig } from '../../constants/countries';
import { isRequired, isPositiveNumber, isValidDateRange } from '../../utils/validation';
import { ImageLightboxModal } from '../../components/common/ImageLightboxModal';

export function CreateQuotation() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingQuotation = location.state?.editQuotation || null;
  const { user: currentUser } = useAuth();

  const {
    company,
    customers,
    products,
    units,
    taxes,
    paymentTerms,
    termsConditions,
    saveQuotation,
    getNextQuotationNumber,
    generateInquiryNumber,
    addCustomer,
    settings
  } = useMasters();
  const { success, error, warning } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);

  // Quotation Meta Form State
  const [quotationNo, setQuotationNo] = useState(() => editingQuotation?.quotationNo || '');
  const [quotationDate, setQuotationDate] = useState(() => editingQuotation?.quotationDate || new Date().toISOString().split('T')[0]);
  const [validUntilDate, setValidUntilDate] = useState(() => {
    if (editingQuotation?.validUntilDate) return editingQuotation.validUntilDate;
    const d = new Date();
    const validityDays = settings?.defaultValidityDays || 30;
    d.setDate(d.getDate() + validityDays);
    return d.toISOString().split('T')[0];
  });
  const [referenceNo, setReferenceNo] = useState(() => editingQuotation?.referenceNo || '');
  const [subject, setSubject] = useState(() => editingQuotation?.subject || '');
  const [salesPerson, setSalesPerson] = useState(
    () => editingQuotation?.salesPerson || editingQuotation?.preparedBy || currentUser?.name || currentUser?.email || 'Authorized Staff'
  );
  const [existingStatus, setExistingStatus] = useState(() => editingQuotation?.status || 'Draft');

  // Multi-Currency & Tax Treatment State
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState(() => editingQuotation?.currency?.code || 'INR');
  const [exchangeRate, setExchangeRate] = useState(() => editingQuotation?.currency?.exchangeRate || 1);
  const [taxTreatment, setTaxTreatment] = useState(() => editingQuotation?.taxTreatment?.type || 'DOMESTIC_REGULAR');
  const [lutNumber, setLutNumber] = useState(() => editingQuotation?.taxTreatment?.lutNumber || '');

  // Currency Switch Confirmation Modal State
  const [currencySwitchModal, setCurrencySwitchModal] = useState({
    isOpen: false,
    targetCurrencyCode: '',
    targetExchangeRate: 1
  });

  const [isFetchingRate, setIsFetchingRate] = useState(false);

  // Silently auto-fetch today's live exchange rate for selected foreign currency
  const fetchLiveRateForCurrency = async (currCode) => {
    if (!currCode || currCode === 'INR') return null;
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${currCode}`);
      const data = await res.json();
      if (data && data.rates && data.rates.INR) {
        return Number(Number(data.rates.INR).toFixed(2));
      }
    } catch (err) {
      // Graceful fallback to default baseline rate
    }
    return null;
  };

  const [isApprovalConfirmOpen, setIsApprovalConfirmOpen] = useState(false);

  // Auto-fetch today's live rate when switching to a foreign currency
  useEffect(() => {
    if (!editingQuotation && selectedCurrencyCode !== 'INR') {
      let isCancelled = false;
      setIsFetchingRate(true);
      fetchLiveRateForCurrency(selectedCurrencyCode).then((liveRate) => {
        if (!isCancelled && liveRate && liveRate > 0) {
          setExchangeRate(liveRate);
        }
        setIsFetchingRate(false);
      });
      return () => {
        isCancelled = true;
      };
    }
  }, [selectedCurrencyCode, editingQuotation]);

  // Ensure salesPerson is immediately set to current user's name when auth loads
  useEffect(() => {
    if (!editingQuotation && currentUser?.name && (!salesPerson || salesPerson === 'Pocika Staff' || salesPerson === 'Authorized Staff')) {
      setSalesPerson(currentUser.name);
      if (!referenceNo || referenceNo.startsWith('INQ-')) {
        generateInquiryNumber(currentUser.name).then((num) => setReferenceNo(num));
      }
    }
  }, [currentUser, editingQuotation]);

  // Selected Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState(() => editingQuotation?.customer?.id || '');
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || editingQuotation?.customer || null,
    [customers, selectedCustomerId, editingQuotation]
  );

  // Sorted products for clean A to Z selection
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [products]);

  // Quick catalog product selector state
  const [selectedCatalogId, setSelectedCatalogId] = useState('');

  // Search & Combobox states for catalog selector
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [isCatalogSearchOpen, setIsCatalogSearchOpen] = useState(false);
  const [selectedProductObj, setSelectedProductObj] = useState(null);
  const catalogSearchRef = useRef(null);

  const [orderType, setOrderType] = useState(() => editingQuotation?.orderType || 'Verbal Order');
  const [poNumber, setPoNumber] = useState(() => editingQuotation?.poNumber || '');
  const [orderNo, setOrderNo] = useState(() => editingQuotation?.orderNo || 'Verbal Order');
  const [shippingAddress, setShippingAddress] = useState(() => editingQuotation?.customer?.shippingAddress || '');
  const [shippingCity, setShippingCity] = useState(() => editingQuotation?.customer?.shippingCity || '');
  const [shippingState, setShippingState] = useState(() => editingQuotation?.customer?.shippingState || '');
  const [shippingPincode, setShippingPincode] = useState(() => editingQuotation?.customer?.shippingPincode || '');
  const [shippingContactPerson, setShippingContactPerson] = useState(() => editingQuotation?.customer?.shippingContactPerson || '');
  const [shippingPhone, setShippingPhone] = useState(() => editingQuotation?.customer?.shippingPhone || '');

  // Dispatch & Freight Details
  const [dispatchDetails, setDispatchDetails] = useState(() => ({
    paymentTerms: editingQuotation?.dispatchDetails?.paymentTerms || '',
    freightTerms: editingQuotation?.dispatchDetails?.freightTerms || 'F.O.R Surat Warehouse',
    freightType: editingQuotation?.dispatchDetails?.freightType || 'To Pay / Actuals',
    grTerm: editingQuotation?.dispatchDetails?.grTerm || 'CC Attached',
    transportName: editingQuotation?.dispatchDetails?.transportName || 'Aurum Transport / Road Transport Surat'
  }));

  // Overall Quotation Discount % (Applied to Gross Subtotal: Supply + Labour)
  const [overallDiscountPercent, setOverallDiscountPercent] = useState(() => {
    return Number(
      editingQuotation?.overallDiscountPercent ??
      editingQuotation?.totals?.overallDiscountPercent ??
      editingQuotation?.financials?.overallDiscountPercent ??
      0
    ) || 0;
  });

  // Overall Quotation GST Rate % (Applied with Total Taxable Value)
  const [overallGstRate, setOverallGstRate] = useState(() => {
    return String(
      editingQuotation?.overallGstRate ??
      editingQuotation?.totals?.overallGstRate ??
      editingQuotation?.financials?.overallGstRate ??
      '18'
    ) || '18';
  });

  // Line items state
  const [items, setItems] = useState(() => {
    if (editingQuotation?.items?.length) {
      return editingQuotation.items.map((it, idx) => ({
        ...it,
        id: it.id || `row-${idx + 1}`,
        laborCount: it.laborCount ?? (parseFloat(it.laborRate) > 0 ? 1 : ''),
        laborRate: it.laborRate ?? '',
        imageUrl: it.imageUrl || products.find((p) => (p.id && p.id === it.productId) || (p._id && p._id === it.productId))?.imageUrl || ''
      }));
    }
    return [
      {
        id: 'row-1',
        productId: '',
        name: '',
        make: 'POCIKA',
        description: '',
        hsnCode: '',
        quantity: 1,
        unit: 'Nos',
        rate: '',
        laborCount: '',
        laborRate: '',
        discountPercent: 0,
        gstRate: 18,
        imageUrl: ''
      }
    ];
  });

  // Ensure items have their catalog image attached whenever products are loaded/updated
  useEffect(() => {
    if (products?.length) {
      setItems((prevItems) => {
        let hasChanges = false;
        const next = prevItems.map((item) => {
          if (item.productId && !item.imageUrl) {
            const match = products.find((p) => (p.id && p.id === item.productId) || (p._id && p._id === item.productId));
            if (match?.imageUrl) {
              hasChanges = true;
              return { ...item, imageUrl: match.imageUrl };
            }
          }
          return item;
        });
        return hasChanges ? next : prevItems;
      });
    }
  }, [products]);

  // Available products in catalog that are not yet added to quotation (prevents duplicate selection)
  const addedProductIds = useMemo(() => {
    return new Set(items.map((it) => it.productId).filter(Boolean));
  }, [items]);

  const availableProducts = useMemo(() => {
    return sortedProducts.filter(
      (p) => !addedProductIds.has(p.id) && !addedProductIds.has(p._id)
    );
  }, [sortedProducts, addedProductIds]);

  // Filtered available products matching search term (name, make, HSN, or category)
  const filteredCatalogProducts = useMemo(() => {
    const term = (catalogSearchTerm || '').trim().toLowerCase();
    if (!term) return availableProducts;
    return availableProducts.filter((p) =>
      (p.name || '').toLowerCase().includes(term) ||
      (p.make || '').toLowerCase().includes(term) ||
      (p.hsnCode || '').toLowerCase().includes(term) ||
      (p.category || '').toLowerCase().includes(term)
    );
  }, [availableProducts, catalogSearchTerm]);

  // Click outside listener for catalog search dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (catalogSearchRef.current && !catalogSearchRef.current.contains(event.target)) {
        setIsCatalogSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Form level & Item level errors
  const [formErrors, setFormErrors] = useState({});
  const [itemErrors, setItemErrors] = useState({});

  // Payment terms & Terms & Conditions selection
  const [selectedPaymentTermId, setSelectedPaymentTermId] = useState(() => paymentTerms[0]?.id || '');
  const [customPaymentNote, setCustomPaymentNote] = useState(() => editingQuotation?.paymentTermsNote || paymentTerms[0]?.description || '');
  const [selectedTermIds, setSelectedTermIds] = useState(() => {
    if (editingQuotation?.selectedTerms?.length) {
      // Find IDs matching existing terms or fallback
      return editingQuotation.selectedTerms.map(st => {
        const match = termsConditions.find(t => t.text === st || t.title === st);
        return match ? match.id : null;
      }).filter(Boolean);
    }
    // Auto-select 5 commercial terms by default
    if (termsConditions && termsConditions.length > 0) {
      return termsConditions.slice(0, 5).map(t => t.id);
    }
    return [];
  });

  // If termsConditions are loaded asynchronously from API, ensure 5 terms are auto-selected for a fresh quotation
  useEffect(() => {
    if (!editingQuotation && selectedTermIds.length === 0 && termsConditions && termsConditions.length > 0) {
      setSelectedTermIds(termsConditions.slice(0, 5).map(t => t.id));
    }
  }, [termsConditions, editingQuotation]);

  const activeTermsText = useMemo(() => {
    return selectedTermIds
      .map(id => termsConditions.find(t => t.id === id)?.text)
      .filter(Boolean);
  }, [selectedTermIds, termsConditions]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Quick Customer Create Modal State
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    siteName: '',
    contactPerson: '',
    phone: '',
    email: '',
    country: 'India',
    customCountry: '',
    city: '',
    state: company.state || 'Gujarat',
    pincode: '',
    taxId: '',
    gstin: '',
    billingAddress: ''
  });
  const [newCustomerErrors, setNewCustomerErrors] = useState({});

  // Initialize Quotation No & Inquiry No if not editing
  useEffect(() => {
    if (!editingQuotation) {
      if (!quotationNo) {
        getNextQuotationNumber(salesPerson || currentUser?.name).then(num => setQuotationNo(num));
      }
      if (!referenceNo) {
        generateInquiryNumber(salesPerson || currentUser?.name).then(num => setReferenceNo(num));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerateInquiry = async () => {
    try {
      const newInq = await generateInquiryNumber(salesPerson || currentUser?.name);
      setReferenceNo(newInq);
      success('Inquiry Generated', `Auto-generated reference: ${newInq}`);
    } catch (err) {
      error('Error', 'Failed to generate inquiry number.');
    }
  };

  // Update payment note when preset term changes
  const handlePaymentTermChange = (e) => {
    const termId = e.target.value;
    setSelectedPaymentTermId(termId);
    const found = paymentTerms.find((p) => p.id === termId);
    if (found) {
      setCustomPaymentNote(found.description);
    }
  };

  // --- AUTO-SAVE FEATURE (Drafts with 3-minute temporary lifespan) ---
  useEffect(() => {
    if (!editingQuotation) {
      try {
        const raw = localStorage.getItem('pocika_quotation_draft');
        if (raw) {
          const parsed = JSON.parse(raw);
          const DRAFT_TTL_MS = 3 * 60 * 1000; // 3 minutes expiration
          const isExpired = !parsed.timestamp || (Date.now() - parsed.timestamp > DRAFT_TTL_MS);

          if (isExpired) {
            localStorage.removeItem('pocika_quotation_draft');
          } else {
            if (parsed.subject) setSubject(parsed.subject);
            if (parsed.referenceNo) setReferenceNo(parsed.referenceNo);
            if (parsed.selectedCustomerId) setSelectedCustomerId(parsed.selectedCustomerId);
            if (parsed.items && parsed.items.length > 0) setItems(parsed.items);
            if (parsed.customPaymentNote) setCustomPaymentNote(parsed.customPaymentNote);
            if (parsed.overallDiscountPercent !== undefined) setOverallDiscountPercent(parsed.overallDiscountPercent);
            if (parsed.overallGstRate !== undefined) setOverallGstRate(parsed.overallGstRate);
          }
        }
      } catch (e) { }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editingQuotation) {
      const draftData = {
        subject,
        referenceNo,
        selectedCustomerId,
        items,
        customPaymentNote,
        overallDiscountPercent,
        overallGstRate,
        timestamp: Date.now()
      };
      // Save only if user entered meaningful changes
      if (subject || selectedCustomerId || (items.length > 0 && items[0].productId) || overallDiscountPercent > 0) {
        localStorage.setItem('pocika_quotation_draft', JSON.stringify(draftData));
      }
    }
  }, [subject, referenceNo, selectedCustomerId, items, customPaymentNote, overallDiscountPercent, overallGstRate, editingQuotation]);


  // Toggle terms & conditions item
  const toggleTermCondition = (id) => {
    setSelectedTermIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // Add product from Catalog and reset selector
  const handleAddProductFromCatalog = (productToUse) => {
    const prod = productToUse || selectedProductObj || (selectedCatalogId ? products.find((p) => (p.id && p.id === selectedCatalogId) || (p._id && p._id === selectedCatalogId)) : null);
    if (!prod) return;

    const newRow = {
      id: `row-${Date.now()}`,
      productId: prod.id || prod._id,
      name: prod.name || '',
      make: prod.make || 'POCIKA',
      description: prod.description || '',
      hsnCode: prod.hsnCode || '',
      quantity: 1,
      unit: prod.unit || 'Nos',
      rate: prod.rate ?? '',
      laborCount: '',
      laborRate: '',
      discountPercent: 0,
      gstRate: prod.gstRate ?? 18,
      imageUrl: prod.imageUrl || ''
    };

    setItems((prev) => {
      // If there is only 1 row and it is completely blank (no name, no rate, no productId), replace it
      if (prev.length === 1 && !prev[0].name && (!prev[0].rate || prev[0].rate === 0) && !prev[0].productId) {
        return [newRow];
      }
      return [...prev, newRow];
    });

    // Reset dropdown and search states
    setSelectedCatalogId('');
    setSelectedProductObj(null);
    setCatalogSearchTerm('');
    setIsCatalogSearchOpen(false);
    success('Product Added', `${prod.name} added to quotation.`);
  };

  // Add Item Row (Custom/Manual blank row)
  const handleAddItemRow = () => {
    const newRowId = `row-${Date.now()}`;
    setItems((prev) => [
      ...prev,
      {
        id: newRowId,
        productId: '',
        name: '',
        make: 'POCIKA',
        description: '',
        hsnCode: '',
        quantity: 1,
        unit: 'Nos',
        rate: '',
        laborCount: '',
        laborRate: '',
        discountPercent: 0,
        gstRate: 18,
        imageUrl: ''
      }
    ]);
  };

  // Remove Item Row
  const handleRemoveItemRow = (index) => {
    if (items.length <= 1) {
      warning('Cannot Delete', 'A quotation must have at least one line item.');
      return;
    }
    const itemToRemove = items[index];
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (itemToRemove && itemErrors[itemToRemove.id]) {
      setItemErrors((prev) => {
        const copy = { ...prev };
        delete copy[itemToRemove.id];
        return copy;
      });
    }
  };

  // Handle Item Row change
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };

      // If user selected a master product, auto fill fields
      if (field === 'productId') {
        const prod = products.find((p) => (p.id && p.id === value) || (p._id && p._id === value));
        if (prod) {
          row.name = prod.name;
          row.make = prod.make || 'POCIKA';
          row.description = prod.description || '';
          row.hsnCode = prod.hsnCode || '';
          row.unit = prod.unit || 'Nos';
          row.rate = prod.rate || 0;
          row.gstRate = prod.gstRate ?? 18;
          row.imageUrl = prod.imageUrl || '';
        }
      }

      updated[index] = row;
      return updated;
    });

    // Clear item-level errors on change
    const rowId = items[index]?.id;
    if (rowId && itemErrors[rowId]?.[field]) {
      setItemErrors((prev) => ({
        ...prev,
        [rowId]: {
          ...prev[rowId],
          [field]: ''
        }
      }));
    }
  };

  // Currency change handling workflow
  const handleInitiateCurrencyChange = async (newCode) => {
    if (newCode === selectedCurrencyCode) return;
    const targetCfg = getCurrencyConfig(newCode);
    let targetRate = targetCfg.defaultExchangeRate || 1;

    // Check if live rate is available
    if (newCode !== 'INR') {
      const liveRate = await fetchLiveRateForCurrency(newCode);
      if (liveRate && liveRate > 0) {
        targetRate = liveRate;
      }
    }

    // If there are no items or only 1 empty row, switch immediately
    const hasActiveValues = items.some((it) => (parseFloat(it.rate) > 0 && it.name));
    if (!hasActiveValues) {
      setSelectedCurrencyCode(newCode);
      setExchangeRate(targetRate);
      return;
    }

    // Open options dialog
    setCurrencySwitchModal({
      isOpen: true,
      targetCurrencyCode: newCode,
      targetExchangeRate: targetRate
    });
  };

  const handleConfirmCurrencyKeepRates = () => {
    setSelectedCurrencyCode(currencySwitchModal.targetCurrencyCode);
    setExchangeRate(currencySwitchModal.targetExchangeRate);
    setCurrencySwitchModal({ isOpen: false, targetCurrencyCode: '', targetExchangeRate: 1 });
    success('Currency Updated', `Quotation currency switched to ${currencySwitchModal.targetCurrencyCode}. Numeric unit prices kept unchanged.`);
  };

  const handleConfirmCurrencyConvertRates = () => {
    const fromCfg = getCurrencyConfig(selectedCurrencyCode);
    const toCfg = getCurrencyConfig(currencySwitchModal.targetCurrencyCode);
    const fromRate = exchangeRate || fromCfg.defaultExchangeRate || 1;
    const toRate = currencySwitchModal.targetExchangeRate || toCfg.defaultExchangeRate || 1;

    // Convert each item's rate: Rate in Base INR = item.rate * fromRate, then Rate in Target = Base INR / toRate
    setItems((prevItems) =>
      prevItems.map((item) => {
        const currentRate = parseFloat(item.rate) || 0;
        if (currentRate === 0) return item;
        const rateInINR = selectedCurrencyCode === 'INR' ? currentRate : currentRate * fromRate;
        const convertedRate = toCfg.code === 'INR' ? rateInINR : rateInINR / toRate;
        const finalRate = toCfg.decimals === 0 ? Math.round(convertedRate) : Number(convertedRate.toFixed(toCfg.decimals));
        return {
          ...item,
          rate: finalRate
        };
      })
    );

    setSelectedCurrencyCode(currencySwitchModal.targetCurrencyCode);
    setExchangeRate(currencySwitchModal.targetExchangeRate);
    setCurrencySwitchModal({ isOpen: false, targetCurrencyCode: '', targetExchangeRate: 1 });
    success('Currency Converted', `Unit rates converted to ${currencySwitchModal.targetCurrencyCode} using exchange rate.`);
  };

  const handleCancelCurrencyChange = () => {
    setCurrencySwitchModal({ isOpen: false, targetCurrencyCode: '', targetExchangeRate: 1 });
  };

  // Calculated totals via multi-currency calculations engine
  const quotationFinancials = useMemo(() => {
    return calculateQuotationTotals({
      items,
      overallDiscountPercent,
      overallGstRate,
      companyState: company.state,
      customerState: selectedCustomer?.state,
      currencyCode: selectedCurrencyCode,
      exchangeRate: exchangeRate,
      taxTreatment: taxTreatment
    });
  }, [items, overallDiscountPercent, overallGstRate, company.state, selectedCustomer?.state, selectedCurrencyCode, exchangeRate, taxTreatment]);

  // Validate form with high precision and visual red-box mapping
  const validateForm = () => {
    const fErrors = {};
    const iErrors = {};
    let hasError = false;

    if (!selectedCustomerId) {
      fErrors.customerId = 'Please select a customer (buyer).';
      hasError = true;
    }

    if (!isRequired(quotationDate)) {
      fErrors.quotationDate = 'Quotation date is required.';
      hasError = true;
    }

    if (!isRequired(validUntilDate)) {
      fErrors.validUntilDate = 'Valid until date is required.';
      hasError = true;
    } else if (!isValidDateRange(quotationDate, validUntilDate)) {
      fErrors.validUntilDate = 'Valid Until Date must be on or after Quotation Date.';
      hasError = true;
    }

    if (items.length === 0) {
      error('Items Required', 'Please add at least one line item.');
      return false;
    }

    items.forEach((item, index) => {
      const rowErr = {};
      if (!isRequired(item.name)) {
        rowErr.name = 'Item name is required';
        hasError = true;
      }
      if (!isRequired(item.quantity) || !isPositiveNumber(item.quantity)) {
        rowErr.quantity = 'Qty > 0 required';
        hasError = true;
      }
      if (!isRequired(item.rate) || !isPositiveNumber(item.rate)) {
        rowErr.rate = 'Rate > 0 required';
        hasError = true;
      }

      if (Object.keys(rowErr).length > 0) {
        iErrors[item.id] = rowErr;
      }
    });

    setFormErrors(fErrors);
    setItemErrors(iErrors);

    if (hasError) {
      error('Missing Information', 'Please fill in all highlighted fields (marked with a red border).');
      return false;
    }

    return true;
  };

  // Save as Draft or Issued Quotation
  const handleSave = async (isDraft = false) => {
    if (isSubmitting) return; // Prevent double submit
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const authorName = salesPerson || currentUser?.name || currentUser?.email || 'Pocika Staff';
      const computedOrderNo = orderType === 'Purchase Order (PO)'
        ? (poNumber ? `PO: ${poNumber}` : 'PO')
        : (orderType === 'Other' ? (orderNo || 'Custom') : orderType);

      const quotationPayload = {
        quotationNo,
        quotationDate,
        validUntilDate,
        referenceNo,
        orderNo: computedOrderNo,
        orderType,
        poNumber,
        dispatchDetails,
        subject,
        salesPerson: authorName,
        preparedBy: authorName,
        createdByName: currentUser?.name || currentUser?.email || 'Pocika Staff',
        createdByEmail: currentUser?.email || '',
        status: isDraft
          ? 'Draft'
          : currentUser?.role !== 'admin'
          ? 'Pending'
          : (existingStatus === 'Draft' || !existingStatus ? 'Sent' : existingStatus),
        baseQuotationNo: editingQuotation?.baseQuotationNo || (quotationNo.includes('-R') ? quotationNo.split('-R')[0] : ''),
        version: editingQuotation?.version || 1,
        revisionLabel: editingQuotation?.revisionLabel || 'v1',
        revisionHistory: editingQuotation?.revisionHistory || [],
        currency: {
          code: quotationFinancials.currencyCode,
          symbol: quotationFinancials.currencySymbol,
          decimals: getCurrencyConfig(selectedCurrencyCode).decimals,
          exchangeRate: quotationFinancials.exchangeRate,
          baseCurrency: 'INR',
          rateDate: new Date().toISOString().split('T')[0],
          rateSource: 'Manual'
        },
        taxTreatment: {
          type: taxTreatment,
          lutNumber: lutNumber,
          note: ''
        },
        customer: {
          ...selectedCustomer,
          shippingAddress: shippingAddress || selectedCustomer?.shippingAddress || selectedCustomer?.billingAddress || '',
          shippingCity: shippingCity || selectedCustomer?.shippingCity || selectedCustomer?.city || '',
          shippingState: shippingState || selectedCustomer?.shippingState || selectedCustomer?.state || '',
          shippingPincode: shippingPincode || selectedCustomer?.shippingPincode || selectedCustomer?.pincode || '',
          shippingContactPerson: shippingContactPerson || selectedCustomer?.shippingContactPerson || selectedCustomer?.contactPerson || '',
          shippingPhone: shippingPhone || selectedCustomer?.shippingPhone || selectedCustomer?.phone || ''
        },
        items: quotationFinancials.items.map((item) => {
          const cat = products.find((p) => (p.id && p.id === item.productId) || (p._id && p._id === item.productId));
          return {
            ...item,
            laborCount: parseFloat(item.laborCount) || 0,
            laborRate: parseFloat(item.laborRate) || 0,
            laborTotal: parseFloat(item.laborTotal) || 0,
            materialTotal: parseFloat(item.materialTotal) || 0,
            imageUrl: item.imageUrl || cat?.imageUrl || ''
          };
        }),
        paymentTermsNote: customPaymentNote,
        selectedTerms: activeTermsText,
        overallDiscountPercent: Number(overallDiscountPercent) || 0,
        overallGstRate: overallGstRate || '18',
        totals: {
          materialTotal: quotationFinancials.materialTotal || 0,
          laborTotal: quotationFinancials.laborTotal || 0,
          subtotal: quotationFinancials.subtotal,
          overallDiscountPercent: Number(overallDiscountPercent) || 0,
          overallGstRate: overallGstRate || '18',
          totalDiscount: quotationFinancials.totalDiscount,
          totalTaxable: quotationFinancials.totalTaxable,
          totalTax: quotationFinancials.totalTax,
          isInterState: quotationFinancials.isInterState,
          cgstAmount: quotationFinancials.cgstAmount,
          sgstAmount: quotationFinancials.sgstAmount,
          igstAmount: quotationFinancials.igstAmount,
          roundOff: quotationFinancials.roundOff,
          grandTotal: quotationFinancials.grandTotal,
          currencyCode: quotationFinancials.currencyCode,
          currencySymbol: quotationFinancials.currencySymbol,
          reporting: quotationFinancials.reporting
        }
      };

      const saved = await saveQuotation(quotationPayload, isDraft);
      localStorage.removeItem('pocika_quotation_draft');
      setIsApprovalConfirmOpen(false);
      
      if (isDraft) {
        success('Draft Saved', `Quotation ${saved.quotationNo} has been saved as draft.`);
      } else if (currentUser?.role !== 'admin') {
        success(
          'Submitted to Admin for Approval',
          `Quotation ${saved.quotationNo} is sent to Admin for review. You can track status in your Quotation List.`
        );
      } else {
        success(
          'Quotation Saved & Issued',
          `Quotation ${saved.quotationNo} has been stored and issued successfully.`
        );
      }

      // Navigate to Quotation Register after 500ms
      setTimeout(() => {
        navigate('/quotations');
      }, 500);
    } catch (err) {
      error('Save Failed', err?.message || 'Failed to save quotation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to clean state
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset this quotation form?')) {
      localStorage.removeItem('pocika_quotation_draft');
      setSelectedCustomerId('');
      setSelectedCatalogId('');
      setSelectedProductObj(null);
      setCatalogSearchTerm('');
      setIsCatalogSearchOpen(false);
      setReferenceNo('');
      setSubject('');
      setFormErrors({});
      setItemErrors({});
      setQuotationDate(new Date().toISOString().split('T')[0]);
      setSalesPerson(currentUser?.name || currentUser?.email || 'Authorized Staff');
      setItems([
        {
          id: `row-${Date.now()}`,
          productId: '',
          name: '',
          make: 'POCIKA',
          description: '',
          hsnCode: '',
          quantity: 1,
          unit: 'Nos',
          rate: '',
          discountPercent: 0,
          gstRate: 18
        }
      ]);
      getNextQuotationNumber().then((num) => setQuotationNo(num));
      success('Form Reset', 'Quotation fields cleared.');
    }
  };

  // Handle quick customer creation
  const handleQuickCustomerSave = async (e) => {
    e.preventDefault();
    const isIndia = (newCustomerForm.country || 'India').toLowerCase() === 'india';
    const effectiveCountry = newCustomerForm.country === 'OTHER'
      ? (newCustomerForm.customCountry || 'Other International Country')
      : newCustomerForm.country;

    const qErrors = {};
    if (!isRequired(newCustomerForm.name)) qErrors.name = 'Customer name is required';
    if (!isRequired(newCustomerForm.phone)) qErrors.phone = 'Phone number is required';
    if (isIndia) {
      if (!isRequired(newCustomerForm.city)) qErrors.city = 'City is required';
      if (!isRequired(newCustomerForm.state)) qErrors.state = 'State is required';
    } else {
      if (newCustomerForm.country === 'OTHER' && !isRequired(newCustomerForm.customCountry)) {
        qErrors.customCountry = 'Please type the country name';
      }
    }

    setNewCustomerErrors(qErrors);
    if (Object.keys(qErrors).length > 0) {
      error('Validation Error', 'Please complete highlighted fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...newCustomerForm,
        country: effectiveCountry,
        state: isIndia ? newCustomerForm.state : (newCustomerForm.state || 'Overseas / Foreign')
      };
      delete payload.customCountry;

      const created = await addCustomer(payload);
      setSelectedCustomerId(created.id);
      setFormErrors((prev) => ({ ...prev, customerId: '' }));

      // If international client, auto-suggest zero-rated export tax treatment
      if (!isIndia) {
        setTaxTreatment('EXPORT_ZERO_RATED');
        const cConfig = getCountryConfig(effectiveCountry);
        if (cConfig && cConfig.defaultCurrency && cConfig.defaultCurrency !== selectedCurrencyCode) {
          handleInitiateCurrencyChange(cConfig.defaultCurrency);
        }
      }

      setIsNewCustomerModalOpen(false);
      setNewCustomerForm({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        country: 'India',
        customCountry: '',
        city: '',
        state: company.state || 'Gujarat',
        pincode: '',
        taxId: '',
        gstin: '',
        billingAddress: ''
      });
      setNewCustomerErrors({});
      success('Customer Created', `${created.name} (${created.id}) created and selected.`);
    } catch (err) {
      console.error('Customer create error:', err);
      const errMsg = err?.response?.data?.error || err?.message || 'Failed to create customer.';
      error('Creation Failed', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-col gap-24">
      {/* Quotation Header & Actions Bar */}
      <div className="quotation-top-bar">
        <div className="flex items-center gap-16" style={{ flexWrap: 'wrap' }}>
          <Badge variant="primary" style={{ fontSize: 14, padding: '6px 12px' }}>
            {quotationNo}
          </Badge>
          <span className="text-muted">New Commercial Quotation</span>
        </div>

        <div className="quotation-top-actions">
          <Button
            variant="secondary"
            icon={Save}
            onClick={() => handleSave(true)}
            isLoading={isSubmitting}
          >
            Save Draft
          </Button>
        </div>
      </div>

      {/* Top Meta Card: Customer Selection & Quotation Reference */}
      <Card>
        <CardHeader
          title="Customer &amp; Quotation Details"
          description="Select buyer profile, quotation validity, and project reference"
          actions={
            <Button
              variant="secondary"
              size="sm"
              icon={UserPlus}
              onClick={() => {
                setNewCustomerErrors({});
                setIsNewCustomerModalOpen(true);
              }}
            >
              + Quick Add Customer
            </Button>
          }
        />
        <CardBody className="flex-col gap-16">
          {/* Row 1: Customer (2 cols) & Project/Subject (1 col) */}
          <div className="form-grid-3">
            <div style={{ gridColumn: 'span 2' }}>
              <Select
                label="Select Customer (Company -> Site -> Person)"
                name="customerId"
                value={selectedCustomerId}
                onChange={(e) => {
                  const cId = e.target.value;
                  setSelectedCustomerId(cId);
                  if (formErrors.customerId) {
                    setFormErrors((prev) => ({ ...prev, customerId: '' }));
                  }
                  const found = customers.find((c) => c.id === cId);
                  if (found) {
                    // Auto-populate Ship To / Delivery Site details from selected customer branch
                    if (found.siteName || found.shippingAddress || found.city) {
                      setShippingAddress(found.shippingAddress || found.billingAddress || (found.siteName ? `${found.siteName}, ${found.city || ''}` : ''));
                    }
                    if (found.contactPerson) {
                      setShippingContactPerson(found.contactPerson);
                    }
                    if (found.phone) {
                      setShippingPhone(found.phone);
                    }
                  }
                  if (found && found.country && found.country.toLowerCase() !== 'india') {
                    setTaxTreatment('EXPORT_ZERO_RATED');
                    const cConfig = getCountryConfig(found.country);
                    if (cConfig?.defaultCurrency && cConfig.defaultCurrency !== selectedCurrencyCode) {
                      handleInitiateCurrencyChange(cConfig.defaultCurrency);
                    }
                  } else if (found && (!found.country || found.country.toLowerCase() === 'india')) {
                    if (taxTreatment === 'EXPORT_ZERO_RATED') {
                      setTaxTreatment('DOMESTIC_REGULAR');
                    }
                  }
                }}
                options={customers.map((c) => {
                  const parts = [c.name];
                  if (c.siteName) {
                    parts.push(`[Site: ${c.siteName}]`);
                  } else if (c.city) {
                    parts.push(`[${c.city}${c.state ? `, ${c.state}` : ''}]`);
                  }
                  if (c.contactPerson) {
                    parts.push(`(Attn: ${c.contactPerson}${c.phone ? ` - ${c.phone}` : ''})`);
                  }
                  return {
                    value: c.id,
                    label: parts.join(' ')
                  };
                })}
                placeholder="-- Choose Customer (Company -> Site -> Person) --"
                required
                error={formErrors.customerId}
              />
            </div>

            <Input
              label="Subject / Project Name"
              name="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Supply &amp; Installation of Fire Hydrant System"
            />
          </div>

          {/* Row 2: Quotation Date, Valid Till, Inquiry / Ref, Order PO Ref, Prepared By */}
          <div className="form-grid-3">
            <Input
              label="Quotation Date"
              name="quotationDate"
              type="date"
              value={quotationDate}
              onChange={(e) => {
                setQuotationDate(e.target.value);
                if (formErrors.quotationDate) {
                  setFormErrors((prev) => ({ ...prev, quotationDate: '' }));
                }
              }}
              required
              error={formErrors.quotationDate}
            />

            <Input
              label="Valid Until Date"
              name="validUntilDate"
              type="date"
              value={validUntilDate}
              onChange={(e) => {
                setValidUntilDate(e.target.value);
                if (formErrors.validUntilDate) {
                  setFormErrors((prev) => ({ ...prev, validUntilDate: '' }));
                }
              }}
              required
              hint="Standard validity: 30 days"
              error={formErrors.validUntilDate}
            />

            <Input
              label="Client Reference / Inquiry No."
              name="referenceNo"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. INQ-DS-0001"
            />
          </div>

          <div className="form-grid-2">
            {/* Smart Integrated Order Reference Control */}
            <div className="flex-col gap-4">
              <label className="form-label">Order Ref / PO Type</label>
              <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-button)', overflow: 'hidden', backgroundColor: '#ffffff', height: '38px' }}>
                <select
                  value={orderType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOrderType(val);
                    if (val === 'Verbal Order' || val === 'Email Approval' || val === 'Letter of Intent (LOI)') {
                      setOrderNo(val);
                    }
                  }}
                  style={{
                    backgroundColor: 'var(--color-surface-hover)',
                    border: 'none',
                    borderRight: '1px solid var(--color-border)',
                    padding: '0 10px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    outline: 'none',
                    maxWidth: '150px'
                  }}
                >
                  <option value="Verbal Order">Verbal (Oral / Call)</option>
                  <option value="Purchase Order (PO)">PO (Purchase Order)</option>
                  <option value="Email Approval">Email (Email Confirmation)</option>
                  <option value="Work Order (WO)">WO (Work Order)</option>
                  <option value="Letter of Intent (LOI)">LOI (Letter of Intent)</option>
                  <option value="Other">Custom (Other Reference)</option>
                </select>
                <input
                  type="text"
                  placeholder={
                    orderType === 'Purchase Order (PO)'
                      ? 'Enter PO Number (e.g. PO/2026/089)'
                      : orderType === 'Work Order (WO)'
                        ? 'Enter WO Number (e.g. WO-5541)'
                        : orderType === 'Letter of Intent (LOI)'
                          ? 'Enter LOI Ref / Date (e.g. LOI-OCT-26)'
                          : orderType === 'Email Approval'
                            ? 'Enter Client Email / Date (e.g. Confirmed via Email on 19-Oct)'
                            : orderType === 'Verbal Order'
                              ? 'Client verbal confirmation (No PO document)'
                              : 'Enter custom reference or remark'
                  }
                  value={
                    orderType === 'Purchase Order (PO)'
                      ? poNumber
                      : orderNo
                  }
                  disabled={orderType === 'Verbal Order'}
                  onChange={(e) => {
                    if (orderType === 'Purchase Order (PO)') {
                      setPoNumber(e.target.value);
                    } else {
                      setOrderNo(e.target.value);
                    }
                  }}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    padding: '8px 12px',
                    fontSize: '12.5px',
                    backgroundColor: orderType === 'Verbal Order' ? 'var(--color-surface-hover)' : '#ffffff',
                    color: 'var(--color-text)'
                  }}
                />
              </div>
            </div>

            <Input
              label="Prepared By (Sales Rep)"
              name="salesPerson"
              value={salesPerson}
              onChange={(e) => setSalesPerson(e.target.value)}
              placeholder="Staff Name"
              disabled={currentUser?.role !== 'admin'}
              hint={currentUser?.role !== 'admin' ? `Frozen to logged-in user (${currentUser?.name || currentUser?.email || 'Staff'})` : `Current login: ${currentUser?.name || currentUser?.email || 'Admin'}`}
            />
          </div>

          {/* Ship To / Site Address Override */}
          <div style={{ borderTop: '1px dashed #fde68a', paddingTop: 8, marginTop: 2 }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', marginBottom: 6 }}>
              Ship To / Delivery Site Address (Leave blank if same as Buyer address):
            </div>
            <div className="form-grid-3">
              <Input
                label="Delivery Site / Project Address"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="e.g. Avadh Arena, VIP Road, Vesu"
              />
              <Input
                label="Site Contact Person"
                value={shippingContactPerson}
                onChange={(e) => setShippingContactPerson(e.target.value)}
                placeholder="e.g. Site Supervisor / Engineer"
              />
              <Input
                label="Site Contact Phone"
                value={shippingPhone}
                onChange={(e) => setShippingPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
              />
            </div>
          </div>

          {/* Quotation Currency & Tax Treatment Controls */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: selectedCurrencyCode !== 'INR' ? '1fr 1fr 1.2fr' : '1.2fr 1.8fr',
              gap: 16,
              padding: '12px 14px',
              backgroundColor: '#f8fafc',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-button)'
            }}
          >
            <div>
              <Select
                label="Quotation Currency"
                name="currencyCode"
                value={selectedCurrencyCode}
                onChange={(e) => handleInitiateCurrencyChange(e.target.value)}
                options={CURRENCY_OPTIONS}
                hint={`Active: ${getCurrencyConfig(selectedCurrencyCode).name} (${getCurrencyConfig(selectedCurrencyCode).symbol.trim()})`}
              />
            </div>

            {selectedCurrencyCode !== 'INR' && (
              <div>
                <Input
                  label={`Exchange Rate (1 ${selectedCurrencyCode} = ₹ INR)`}
                  name="exchangeRate"
                  type="number"
                  step="0.01"
                  min="0.0001"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Math.max(0.0001, parseFloat(e.target.value) || 1))}
                  hint={isFetchingRate ? `Fetching today's live rate...` : `Today's rate (editable anytime)`}
                />
              </div>
            )}

            <div>
              <Select
                label="Applicable Tax Treatment"
                name="taxTreatment"
                value={taxTreatment}
                onChange={(e) => setTaxTreatment(e.target.value)}
                options={[
                  { value: 'DOMESTIC_REGULAR', label: 'Domestic GST (State-Routed CGST+SGST or IGST)' },
                  { value: 'EXPORT_ZERO_RATED', label: 'Export of Goods under LUT / Bond (0% GST)' },
                  { value: 'EXPORT_WITH_TAX', label: 'Export of Goods with IGST Payment' },
                  { value: 'EXEMPT', label: 'Exempt / Non-Taxable Supply (0% GST)' }
                ]}
                hint={
                  taxTreatment === 'EXPORT_ZERO_RATED'
                    ? 'Export with 0% tax under Letter of Undertaking'
                    : taxTreatment === 'EXPORT_WITH_TAX'
                      ? 'Export with IGST applicable'
                      : 'Standard GST rules apply based on place of supply'
                }
              />
              {taxTreatment === 'EXPORT_ZERO_RATED' && (
                <div style={{ marginTop: 8 }}>
                  <Input
                    label="LUT / Bond ARN Reference"
                    name="lutNumber"
                    value={lutNumber}
                    onChange={(e) => setLutNumber(e.target.value)}
                    placeholder="e.g. AD240426001234F"
                    hint="Printed on tax invoice/quotation for zero-rated export"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Customer Autofilled Details & State Tax Indicator */}
          {selectedCustomer ? (
            <div
              style={{
                backgroundColor: 'var(--color-surface-hover)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-button)',
                padding: '16px'
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <div className="flex items-center gap-8">
                  <span className="text-bold">{selectedCustomer.name}</span>
                  <Badge variant="neutral">{selectedCustomer.id}</Badge>
                  {selectedCustomer.country && selectedCustomer.country.toLowerCase() !== 'india' ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe'
                      }}
                    >
                      <Globe size={12} /> {selectedCustomer.country}
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#f0fdf4',
                        color: '#15803d',
                        border: '1px solid #bbf7d0'
                      }}
                    >
                      <ShieldCheck size={12} /> India
                    </span>
                  )}
                </div>

                <div>
                  {selectedCustomer.country && selectedCustomer.country.toLowerCase() !== 'india' ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        borderRadius: 4,
                        fontSize: '11.5px',
                        fontWeight: 600,
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe'
                      }}
                    >
                      <Globe size={13} /> Zero-Rated Export of Goods (0% GST under LUT / Bond)
                    </span>
                  ) : quotationFinancials.isInterState ? (
                    <Badge variant="info">
                      Inter-State Supply ({company.state || 'Gujarat'} &rarr; {selectedCustomer.state}): IGST Applies
                    </Badge>
                  ) : (
                    <Badge variant="success">
                      Intra-State Supply ({company.state || 'Gujarat'} &rarr; {selectedCustomer.state}): CGST + SGST Applies
                    </Badge>
                  )}
                </div>
              </div>

              <div className="form-grid-3 text-caption">
                <div>
                  <span className="text-muted">Contact:</span>{' '}
                  {selectedCustomer.contactPerson || '-'} ({selectedCustomer.phone || '-'})
                </div>
                <div>
                  <span className="text-muted">Location:</span>{' '}
                  {[selectedCustomer.city, selectedCustomer.state, selectedCustomer.pincode, selectedCustomer.country].filter(Boolean).join(', ')}
                </div>
                <div>
                  {selectedCustomer.country && selectedCustomer.country.toLowerCase() !== 'india' ? (
                    <span>
                      <span className="text-muted">Tax ID / Reg:</span>{' '}
                      {selectedCustomer.taxId || selectedCustomer.gstin ? (
                        <code style={{ fontWeight: 600 }}>{selectedCustomer.taxId || selectedCustomer.gstin}</code>
                      ) : (
                        'Not Specified'
                      )}
                    </span>
                  ) : (
                    <span>
                      <span className="text-muted">GSTIN:</span>{' '}
                      {selectedCustomer.gstin ? (
                        <code style={{ fontWeight: 600 }}>{selectedCustomer.gstin}</code>
                      ) : (
                        'Unregistered'
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: formErrors.customerId ? 'var(--color-danger-light)' : 'var(--color-surface-hover)',
                border: `1px solid ${formErrors.customerId ? 'var(--color-danger)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-button)',
                fontSize: '13px',
                color: formErrors.customerId ? 'var(--color-danger)' : 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <AlertCircle size={16} />
              <span>Please choose a customer from the dropdown above to auto-route GST and fill billing addresses.</span>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Line Items Table (Desktop/Tablet) & Stacked Cards (Mobile) */}
      <Card style={{ overflow: 'visible' }}>
        <CardHeader
          title="Line Items &amp; Fire Safety Equipment"
          description="Pick equipment from catalog to add directly to quotation"
        />

        {/* Quick Searchable Catalog Adder Bar */}
        <div
          ref={catalogSearchRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            backgroundColor: 'var(--color-surface-hover)',
            borderBottom: '1px solid var(--color-border)',
            flexWrap: 'wrap',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: '280px', position: 'relative' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
              Choose Product:
            </span>

            {/* Search Input Box */}
            <div style={{ position: 'relative', width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-button)',
                  padding: '0 10px',
                  height: '38px',
                  boxShadow: isCatalogSearchOpen ? '0 0 0 2px var(--color-primary-light)' : 'none',
                  borderColor: isCatalogSearchOpen ? 'var(--color-primary)' : 'var(--color-border)'
                }}
              >
                <Search size={16} style={{ color: 'var(--color-text-muted)', marginRight: 8, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder={availableProducts.length > 0 ? "Search by product name, make, HSN code..." : "All catalog products added"}
                  value={catalogSearchTerm}
                  disabled={availableProducts.length === 0}
                  onChange={(e) => {
                    setCatalogSearchTerm(e.target.value);
                    setSelectedProductObj(null);
                    setIsCatalogSearchOpen(true);
                  }}
                  onFocus={() => setIsCatalogSearchOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (selectedProductObj) {
                        handleAddProductFromCatalog(selectedProductObj);
                      } else if (filteredCatalogProducts.length === 1) {
                        handleAddProductFromCatalog(filteredCatalogProducts[0]);
                      }
                    } else if (e.key === 'Escape') {
                      setIsCatalogSearchOpen(false);
                    }
                  }}
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: '13px',
                    backgroundColor: 'transparent'
                  }}
                />
                {catalogSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogSearchTerm('');
                      setSelectedProductObj(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                      color: 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
                <ChevronDown
                  size={16}
                  style={{
                    color: 'var(--color-text-muted)',
                    marginLeft: 6,
                    cursor: 'pointer',
                    transform: isCatalogSearchOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s ease'
                  }}
                  onClick={() => setIsCatalogSearchOpen((prev) => !prev)}
                />
              </div>

              {/* Floating Dropdown Results */}
              {isCatalogSearchOpen && (
                <div
                  className="table-container"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
                    maxHeight: '380px',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    overscrollBehavior: 'contain',
                    WebkitOverflowScrolling: 'touch',
                    zIndex: 200
                  }}
                >
                  <div
                    style={{
                      padding: '8px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      backgroundColor: 'var(--color-surface-hover)',
                      borderBottom: '1px solid var(--color-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      backdropFilter: 'blur(4px)'
                    }}
                  >
                    <span>AVAILABLE PRODUCTS ({filteredCatalogProducts.length})</span>
                    <span>Click to select</span>
                  </div>

                  {filteredCatalogProducts.length > 0 ? (
                    filteredCatalogProducts.map((p) => {
                      const pid = p.id || p._id;
                      const isSelected = selectedProductObj && (selectedProductObj.id === pid || selectedProductObj._id === pid);
                      return (
                        <div
                          key={pid}
                          onClick={() => {
                            setSelectedProductObj(p);
                            setCatalogSearchTerm(p.name);
                            setIsCatalogSearchOpen(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            borderBottom: '1px solid var(--color-border)',
                            backgroundColor: isSelected ? 'var(--color-primary-light)' : '#ffffff',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                          }}
                        >
                          {/* Image */}
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 4,
                              border: '1px solid var(--color-border)',
                              backgroundColor: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              flexShrink: 0
                            }}
                          >
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                              <Package size={16} color="var(--color-text-subtle)" />
                            )}
                          </div>

                          {/* Details */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', gap: 8, marginTop: 2 }}>
                              <span>Make: <strong style={{ color: 'var(--color-primary)' }}>{p.make || 'POCIKA'}</strong></span>
                              {p.hsnCode && <span>HSN: {p.hsnCode}</span>}
                              {p.unit && <span>Unit: {p.unit}</span>}
                            </div>
                          </div>

                          {/* Price */}
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
                              {formatCurrency(p.rate)}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                              GST: {p.gstRate ?? 18}%
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                      {availableProducts.length === 0
                        ? 'All products from catalog have already been added to this quotation.'
                        : `No products matching "${catalogSearchTerm}" found.`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            disabled={!selectedProductObj}
            onClick={() => handleAddProductFromCatalog(selectedProductObj)}
          >
            Add Product
          </Button>
        </div>

        {/* Master Units Datalist for autocomplete */}
        <datalist id="master-units-list">
          {(units || []).map((u) => (
            <option key={u.id || u.name} value={u.symbol || u.name} />
          ))}
        </datalist>

        <div className="quotation-items-desktop table-container" style={{ width: '100%' }}>
          <table className="table" style={{ fontSize: '13px', width: '100%', minWidth: '950px' }}>
            <thead>
              <tr>
                <th style={{ width: 28, textAlign: 'center', padding: '10px 4px' }}>#</th>
                <th style={{ width: 48, textAlign: 'center', padding: '10px 4px' }}>Photo</th>
                <th style={{ minWidth: 240, padding: '10px 8px' }}>Description & Specifications <span style={{ color: 'var(--color-danger)' }}>*</span></th>
                <th style={{ width: 85, padding: '10px 4px', textAlign: 'center' }}>HSN/SAC</th>
                <th style={{ width: 56, padding: '10px 4px', textAlign: 'center' }}>Qty <span style={{ color: 'var(--color-danger)' }}>*</span></th>
                <th style={{ width: 54, padding: '10px 4px', textAlign: 'center' }}>Unit</th>
                <th style={{ width: 95, padding: '10px 4px', textAlign: 'center' }}>Supply Rate ({quotationFinancials.currencySymbol.trim()})</th>
                <th style={{ width: 95, padding: '10px 4px', textAlign: 'center' }}>Labour Rate ({quotationFinancials.currencySymbol.trim()})</th>
                <th style={{ width: 100, padding: '10px 4px', textAlign: 'center' }}>Total Supply ({quotationFinancials.currencySymbol.trim()})</th>
                <th style={{ width: 100, padding: '10px 4px', textAlign: 'center' }}>Total Labour ({quotationFinancials.currencySymbol.trim()})</th>
                <th style={{ width: 105, padding: '10px 4px', textAlign: 'center', backgroundColor: 'var(--color-surface-hover)' }}>Total ({quotationFinancials.currencySymbol.trim()})</th>
                <th style={{ width: 38, padding: '10px 4px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {quotationFinancials.items.map((row, idx) => {
                const rowErrors = itemErrors[row.id] || {};
                const displayImg = row.imageUrl || products.find((p) => (p.id && p.id === row.productId) || (p._id && p._id === row.productId))?.imageUrl;
                const qtyVal = Number(row.quantity) || 0;
                const supplyRateVal = parseFloat(row.rate) || 0;
                const laborRateVal = parseFloat(row.laborRate) || 0;
                const lineSupplyTotal = qtyVal * supplyRateVal;
                const lineLaborTotal = qtyVal * laborRateVal;
                const lineCombinedTotal = lineSupplyTotal + lineLaborTotal;

                return (
                  <tr key={row.id} className="quotation-item-row">
                    <td style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 600, paddingTop: 12, paddingLeft: 2, paddingRight: 2 }}>
                      {idx + 1}
                    </td>

                    {/* Dedicated Compact Photo Column */}
                    <td style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: 8, paddingLeft: 2, paddingRight: 2, width: 48 }}>
                      {displayImg ? (
                        <div
                          onClick={() => setViewingImage({ url: displayImg, title: row.name || 'Product Image' })}
                          title="Click to zoom equipment photo"
                          style={{
                            width: 38,
                            height: 42,
                            margin: '0 auto',
                            borderRadius: 6,
                            backgroundColor: '#ffffff',
                            border: '1px solid var(--color-border)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            position: 'relative',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                            e.currentTarget.style.transform = 'scale(1.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <img
                            src={displayImg}
                            alt=""
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              padding: 1
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: 38,
                            height: 42,
                            margin: '0 auto',
                            borderRadius: 6,
                            backgroundColor: 'var(--color-surface-hover)',
                            border: '1px dashed var(--color-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-subtle)'
                          }}
                          title="No product image"
                        >
                          <Package size={16} />
                        </div>
                      )}
                    </td>

                    {/* Item Description & Specifications with Make */}
                    <td style={{ padding: '6px 8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <input
                          type="text"
                          className={`form-input ${rowErrors.name ? 'input-error' : ''}`}
                          style={{ fontSize: '12px', width: '100%', padding: '5px 8px', fontWeight: 600 }}
                          placeholder="Item Title / Model (Required)"
                          value={row.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontWeight: 500 }}>Make:</span>
                          <input
                            type="text"
                            className="form-input"
                            style={{ fontSize: '11px', padding: '2px 8px', height: '25px' }}
                            placeholder="e.g. POCIKA / KIRLOSKAR"
                            value={row.make || ''}
                            onChange={(e) => handleItemChange(idx, 'make', e.target.value)}
                          />
                        </div>

                        <textarea
                          className="form-textarea"
                          rows={2}
                          style={{ fontSize: '11.5px', padding: '4px 8px', width: '100%' }}
                          placeholder="Technical specifications, flow rate, pressure, standards..."
                          value={row.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        />
                        {rowErrors.name && (
                          <span className="item-field-error">{rowErrors.name}</span>
                        )}
                      </div>
                    </td>

                    {/* HSN/SAC Column */}
                    <td style={{ padding: '6px 2px', verticalAlign: 'top', paddingTop: 8 }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: '11px', textAlign: 'center', padding: '5px 2px' }}
                        placeholder="84241000"
                        value={row.hsnCode || ''}
                        onChange={(e) => handleItemChange(idx, 'hsnCode', e.target.value)}
                        title="HSN / SAC Code"
                      />
                    </td>

                    {/* Quantity */}
                    <td style={{ padding: '6px 2px', verticalAlign: 'top', paddingTop: 8 }}>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className={`form-input ${rowErrors.quantity ? 'input-error' : ''}`}
                        style={{ fontSize: '12px', textAlign: 'center', padding: '5px 2px' }}
                        value={row.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      />
                      {rowErrors.quantity && (
                        <span className="item-field-error">{rowErrors.quantity}</span>
                      )}
                    </td>

                    {/* Unit */}
                    <td style={{ padding: '6px 2px', verticalAlign: 'top', paddingTop: 8 }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: '11px', textAlign: 'center', padding: '5px 2px' }}
                        placeholder="Nos"
                        value={row.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        list="master-units-list"
                      />
                    </td>

                    {/* Supply Rate (₹) */}
                    <td style={{ padding: '6px 2px', verticalAlign: 'top', paddingTop: 8 }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={`form-input ${rowErrors.rate ? 'input-error' : ''}`}
                        style={{ fontSize: '12px', textAlign: 'center', padding: '5px 4px' }}
                        placeholder="0.00"
                        value={row.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                        title="Supply Rate per Unit"
                      />
                      {rowErrors.rate && (
                        <span className="item-field-error">{rowErrors.rate}</span>
                      )}
                    </td>

                    {/* Labour Rate (₹) */}
                    <td style={{ padding: '6px 2px', verticalAlign: 'top', paddingTop: 8 }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        style={{ fontSize: '12px', textAlign: 'center', padding: '5px 4px' }}
                        placeholder="0.00"
                        value={row.laborRate ?? ''}
                        onChange={(e) => handleItemChange(idx, 'laborRate', e.target.value)}
                        title="Labour rate per unit"
                      />
                    </td>

                    {/* Total Supply Rate (Qty × Supply Rate) */}
                    <td style={{ textAlign: 'center', fontWeight: 600, verticalAlign: 'top', paddingTop: 14, paddingLeft: 2, paddingRight: 4, fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {formatCurrency(lineSupplyTotal, false, selectedCurrencyCode)}
                    </td>

                    {/* Total Labour Rate (Qty × Labour Rate) */}
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#059669', verticalAlign: 'top', paddingTop: 14, paddingLeft: 2, paddingRight: 4, fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {formatCurrency(lineLaborTotal, false, selectedCurrencyCode)}
                    </td>

                    {/* Line Total: Total Supply + Total Labour */}
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-primary)', backgroundColor: 'var(--color-surface-hover)', verticalAlign: 'top', paddingTop: 14, paddingLeft: 2, paddingRight: 4, fontSize: '12.5px', whiteSpace: 'nowrap' }} title="Total (Supply + Labour)">
                      {formatCurrency(lineCombinedTotal, false, selectedCurrencyCode)}
                    </td>

                    {/* Delete Action */}
                    <td style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: 10, paddingLeft: 2, paddingRight: 2 }}>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleRemoveItemRow(idx)}
                        title="Remove row"
                        disabled={items.length <= 1}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderTop: '2px solid var(--color-border)' }}>
                <td colSpan={4} style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: 'var(--color-text)' }}>
                  Total ({quotationFinancials.items.length} {quotationFinancials.items.length === 1 ? 'item' : 'items'})
                </td>
                <td style={{ textAlign: 'center', padding: '12px 4px', fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
                  {quotationFinancials.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}
                </td>
                <td colSpan={3} style={{ textAlign: 'right', padding: '12px 8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Grand Subtotal:
                </td>
                {/* Total Supply Rate Column Sum */}
                <td style={{ textAlign: 'center', padding: '12px 4px', fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap' }} title="Total Supply Value">
                  {formatCurrency(quotationFinancials.materialTotal, false, selectedCurrencyCode)}
                </td>
                {/* Total Labour Rate Column Sum */}
                <td style={{ textAlign: 'center', padding: '12px 4px', fontSize: '13px', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }} title="Total Labour Value">
                  {formatCurrency(quotationFinancials.laborTotal, false, selectedCurrencyCode)}
                </td>
                {/* Combined Total Supply + Total Labour Sum */}
                <td style={{ textAlign: 'center', padding: '12px 4px', fontSize: '13.5px', fontWeight: 800, color: 'var(--color-primary)', backgroundColor: 'var(--color-surface-hover)', whiteSpace: 'nowrap' }} title="Total Combined (Supply + Labour)">
                  {formatCurrency(quotationFinancials.subtotal, false, selectedCurrencyCode)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 2. Mobile View (Stacked Cards per Item) */}
        <div className="quotation-items-mobile">
          {quotationFinancials.items.map((row, idx) => {
            const rowErrors = itemErrors[row.id] || {};
            return (
              <div key={row.id} className="quotation-item-card">
                <div className="item-card-header">
                  <div className="item-card-index">
                    <span className="badge badge-primary">#{idx + 1}</span>
                    <span>Item Details</span>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={() => handleRemoveItemRow(idx)}
                    disabled={items.length <= 1}
                    title="Remove item"
                  >
                    Delete
                  </Button>
                </div>

                <div className="flex-col gap-8">
                  <label className="form-label">Catalog Product</label>
                  {(() => {
                    const mobileDisplayImg = row.imageUrl || products.find((p) => (p.id && p.id === row.productId) || (p._id && p._id === row.productId))?.imageUrl;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          onClick={() => {
                            if (mobileDisplayImg) setViewingImage({ url: mobileDisplayImg, title: row.name || 'Product Image' });
                          }}
                          title={mobileDisplayImg ? "Click to zoom equipment photo" : "Product photo"}
                          style={{
                            width: 44,
                            minWidth: 44,
                            height: 56,
                            borderRadius: 6,
                            backgroundColor: '#ffffff',
                            border: mobileDisplayImg ? '1px solid var(--color-border)' : '1px dashed var(--color-border)',
                            boxShadow: mobileDisplayImg ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: mobileDisplayImg ? 'pointer' : 'default',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}
                        >
                          {mobileDisplayImg ? (
                            <img
                              src={mobileDisplayImg}
                              alt=""
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                padding: 2
                              }}
                            />
                          ) : (
                            <Package size={18} color="var(--color-text-subtle)" />
                          )}
                        </div>
                        <select
                          className="form-select"
                          style={{ flex: 1 }}
                          value={row.productId}
                          onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        >
                          <option value="">-- Choose from Catalog (A to Z) --</option>
                          {sortedProducts.map((p) => (
                            <option key={p.id || p._id} value={p.id || p._id}>
                              {p.name} ({formatCurrency(p.rate)})
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex-col gap-4">
                  <label className="form-label">
                    Item Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${rowErrors.name ? 'input-error' : ''}`}
                    placeholder="e.g. ABC Extinguisher 4kg"
                    value={row.name}
                    onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                  />
                  {rowErrors.name && (
                    <span className="item-field-error">{rowErrors.name}</span>
                  )}
                </div>

                <div className="flex-col gap-4">
                  <label className="form-label">Make / Brand</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. POCIKA"
                    value={row.make || ''}
                    onChange={(e) => handleItemChange(idx, 'make', e.target.value)}
                  />
                </div>

                <div className="flex-col gap-4">
                  <label className="form-label">Specifications</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Technical specifications, IS standard..."
                    value={row.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                  />
                </div>

                <div className="item-card-grid">
                  <div className="flex-col gap-4">
                    <label className="form-label">HSN/SAC Code</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="84241000"
                      value={row.hsnCode}
                      onChange={(e) => handleItemChange(idx, 'hsnCode', e.target.value)}
                    />
                  </div>

                  <div className="flex-col gap-4">
                    <label className="form-label">Unit</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nos"
                      value={row.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                    />
                  </div>
                </div>

                <div className="item-card-grid">
                  <div className="flex-col gap-4">
                    <label className="form-label">
                      Quantity <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className={`form-input ${rowErrors.quantity ? 'input-error' : ''}`}
                      value={row.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    />
                    {rowErrors.quantity && (
                      <span className="item-field-error">{rowErrors.quantity}</span>
                    )}
                  </div>

                  <div className="flex-col gap-4">
                    <label className="form-label">
                      SUPPLY ({quotationFinancials.currencySymbol.trim()}) <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className={`form-input ${rowErrors.rate ? 'input-error' : ''}`}
                      placeholder="0.00"
                      value={row.rate}
                      onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                    />
                    {rowErrors.rate && (
                      <span className="item-field-error">{rowErrors.rate}</span>
                    )}
                  </div>

                  <div className="flex-col gap-4">
                    <label className="form-label">
                      Labour / Unit ({quotationFinancials.currencySymbol.trim()})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      placeholder="0.00"
                      value={row.laborRate ?? ''}
                      onChange={(e) => handleItemChange(idx, 'laborRate', e.target.value)}
                    />
                    {parseFloat(row.laborRate) > 0 && (
                      <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>
                        = ₹{((parseFloat(row.quantity) || 0) * (parseFloat(row.laborRate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} total labour
                      </span>
                    )}
                  </div>
                </div>

                <div className="item-card-grid">
                  <div className="flex-col gap-4">
                    <label className="form-label">GST Rate %</label>
                    <select
                      className="form-select"
                      value={row.gstRate}
                      onChange={(e) => handleItemChange(idx, 'gstRate', e.target.value)}
                    >
                      <option value="18">18%</option>
                      <option value="12">12%</option>
                      <option value="5">5%</option>
                      <option value="28">28%</option>
                      <option value="0">0%</option>
                    </select>
                  </div>
                </div>

                <div className="item-card-summary">
                  <div>
                    <span className="text-muted">Taxable: </span>
                    <strong>{formatCurrency(row.taxableAmount, false, selectedCurrencyCode)}</strong>
                  </div>
                  <div>
                    <span className="text-muted">Line Total: </span>
                    <strong style={{ color: 'var(--color-primary)' }}>
                      {formatCurrency(row.totalAmount, false, selectedCurrencyCode)}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}

          <Button
            variant="secondary"
            icon={Plus}
            onClick={handleAddItemRow}
            style={{ width: '100%', minHeight: 44 }}
          >
            Add Product
          </Button>
        </div>
      </Card>

      {/* Summary Box & Terms */}
      <div className="form-grid-2">
        {/* Payment Terms & Conditions */}
        <Card>
          <CardHeader
            title="Commercial Terms &amp; Conditions"
            description="Select payment milestones and statutory clauses"
          />
          <CardBody className="flex-col gap-16">
            <Select
              label="Preset Payment Term"
              name="paymentTerm"
              value={selectedPaymentTermId}
              onChange={handlePaymentTermChange}
              options={paymentTerms.map((pt) => ({ value: pt.id, label: pt.title }))}
            />

            <Input
              label="Payment Terms Note (Printed on quotation)"
              name="customPaymentNote"
              value={customPaymentNote}
              onChange={(e) => setCustomPaymentNote(e.target.value)}
              multiline
              rows={2}
            />

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ margin: 0 }}>
                  Include Standard Quotation Clauses:
                </label>
                <span className="text-caption text-muted">
                  {selectedTermIds.length} of {termsConditions.length} selected
                </span>
              </div>
              <div
                className="flex-col gap-8 custom-scrollbar"
                style={{
                  maxHeight: '340px',
                  overflowY: 'auto',
                  paddingRight: '6px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-button)',
                  padding: '8px'
                }}
              >
                {termsConditions.map((tc) => {
                  const isChecked = selectedTermIds.includes(tc.id);
                  return (
                    <div
                      key={tc.id}
                      onClick={() => toggleTermCondition(tc.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '8px 12px',
                        backgroundColor: isChecked ? 'var(--color-surface-hover)' : 'transparent',
                        border: isChecked ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-button)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        flexShrink: 0
                      }}
                    >
                      <div style={{ marginTop: 2, color: isChecked ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                        {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{tc.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: 2, lineHeight: '16px' }}>
                          {tc.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Live Financial Calculation Summary */}
        <Card>
          <CardHeader
            title="Quotation Valuation Breakdown"
            description="Calculated live with GST state routing and rounding engine"
          />
          <CardBody className="flex-col gap-16">
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-button)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text)' }}>Gross Subtotal:</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>
                      {formatCurrency(quotationFinancials.subtotal, true, selectedCurrencyCode)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#fffbf0' }}>
                    <td style={{ padding: '8px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>Trade Disc %:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          className="form-input"
                          style={{ width: '80px', padding: '4px 8px', height: '28px', fontSize: '13px', textAlign: 'center' }}
                          placeholder="0"
                          value={overallDiscountPercent === 0 ? '' : overallDiscountPercent}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || val === null || val === undefined) {
                              setOverallDiscountPercent('');
                            } else {
                              const num = parseFloat(val);
                              if (!isNaN(num)) {
                                setOverallDiscountPercent(Math.max(0, Math.min(100, num)));
                              } else {
                                setOverallDiscountPercent(val);
                              }
                            }
                          }}
                          onBlur={() => {
                            if (overallDiscountPercent === '' || isNaN(Number(overallDiscountPercent))) {
                              setOverallDiscountPercent(0);
                            }
                          }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>(Applied on Gross Subtotal)</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', color: 'var(--color-danger)', fontWeight: 600, verticalAlign: 'middle' }}>
                      {quotationFinancials.totalDiscount > 0 ? `- ${formatCurrency(quotationFinancials.totalDiscount, true, selectedCurrencyCode)}` : '-'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)' }}>
                    <td style={{ padding: '8px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '13px', lineHeight: '26px' }}>Total Taxable Value:</span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: '#ffffff', height: '26px', padding: '0 6px', borderRadius: 4, border: '1px solid var(--color-border)', boxSizing: 'border-box' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', lineHeight: '1' }}>GST:</span>
                          <select
                            className="form-select"
                            style={{ height: '24px', padding: '0 4px', fontSize: '12px', fontWeight: 700, border: 'none', background: 'transparent', cursor: 'pointer', outline: 'none', color: 'var(--color-text)' }}
                            value={overallGstRate}
                            onChange={(e) => setOverallGstRate(e.target.value)}
                            title="Select GST Slab from Tax Master"
                          >
                            {(taxes && taxes.length > 0) ? (
                              taxes.map((t) => {
                                const rateVal = String(t.rate ?? '');
                                return (
                                  <option key={t.id || t._id || rateVal} value={rateVal}>
                                    {rateVal}%
                                  </option>
                                );
                              })
                            ) : (
                              <>
                                <option value="18">18%</option>
                                <option value="12">12%</option>
                                <option value="5">5%</option>
                                <option value="28">28%</option>
                                <option value="0">0%</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, verticalAlign: 'middle' }}>
                      {formatCurrency(quotationFinancials.totalTaxable, true, selectedCurrencyCode)}
                    </td>
                  </tr>

                  {/* GST Routing Rows */}
                  {taxTreatment === 'EXPORT_ZERO_RATED' || taxTreatment === 'EXEMPT' ? (
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          Export / Zero-Rated Tax (0%)
                          <span title="Zero-rated supply under LUT/Bond or exempt supply" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', color: 'var(--color-text-subtle)' }}>
                            <HelpCircle size={13} />
                          </span>
                          :
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500 }}>
                        {formatCurrency(0, true, selectedCurrencyCode)}
                      </td>
                    </tr>
                  ) : !quotationFinancials.isInterState ? (
                    <>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            Central GST (CGST)
                            <span title="Intrastate supply within same state (50% CGST)" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', color: 'var(--color-text-subtle)' }}>
                              <HelpCircle size={13} />
                            </span>
                            :
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500 }}>
                          {formatCurrency(quotationFinancials.cgstAmount, true, selectedCurrencyCode)}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            State GST (SGST)
                            <span title="Intrastate supply within same state (50% SGST)" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', color: 'var(--color-text-subtle)' }}>
                              <HelpCircle size={13} />
                            </span>
                            :
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500 }}>
                          {formatCurrency(quotationFinancials.sgstAmount, true, selectedCurrencyCode)}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          Integrated GST (IGST)
                          <span title="Interstate supply to different state or export with tax (100% IGST)" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', color: 'var(--color-text-subtle)' }}>
                            <HelpCircle size={13} />
                          </span>
                          :
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500 }}>
                        {formatCurrency(quotationFinancials.igstAmount, true, selectedCurrencyCode)}
                      </td>
                    </tr>
                  )}

                  {quotationFinancials.roundOff !== 0 && (
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 16px', color: 'var(--color-text-muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          Round Off Adjustment
                          <span title="Mathematical rounding to whole currency unit" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', color: 'var(--color-text-subtle)' }}>
                            <HelpCircle size={13} />
                          </span>
                          :
                        </span>
                      </td>
                      <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                        {quotationFinancials.roundOff > 0
                          ? `+ ${quotationFinancials.currencySymbol.trim()} ${quotationFinancials.roundOff}`
                          : `- ${quotationFinancials.currencySymbol.trim()} ${Math.abs(quotationFinancials.roundOff)}`}
                      </td>
                    </tr>
                  )}

                  <tr style={{ borderTop: '2px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)' }}>
                    <td style={{ padding: '14px 16px', fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>
                      Grand Total ({selectedCurrencyCode}):
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.3px' }}>
                        {formatCurrency(quotationFinancials.grandTotal, true, selectedCurrencyCode)}
                      </span>
                    </td>
                  </tr>

                  {selectedCurrencyCode !== 'INR' && (
                    <tr style={{ borderTop: '1px dashed var(--color-border)', backgroundColor: '#f1f5f9' }}>
                      <td style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        Reporting Equivalent (@ 1 {selectedCurrencyCode} = ₹{exchangeRate}):
                      </td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: 'var(--color-text)' }}>
                        ₹ {(quotationFinancials.grandTotal * exchangeRate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Amount in Words Display */}
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--color-surface-hover)',
                borderRadius: 'var(--radius-button)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                flexWrap: 'wrap'
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                Amount in Words ({selectedCurrencyCode}):
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', fontStyle: 'italic' }}>
                {amountInWords(quotationFinancials.grandTotal, selectedCurrencyCode)}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Full-Width Responsive Master Action Toolbar */}
      <div className="quotation-bottom-bar">
        <div className="quotation-bottom-left">
          <Button
            type="button"
            variant="ghost"
            icon={RotateCcw}
            onClick={handleReset}
            disabled={isSubmitting}
            style={{ color: 'var(--color-danger, #e53e3e)' }}
          >
            Reset Form
          </Button>
        </div>

        <div className="quotation-bottom-right">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            icon={Eye}
            onClick={() => {
              if (items.length === 0) {
                error('Items Needed', 'Please add at least one line item to preview the quotation.');
                return;
              }
              setIsPreviewOpen(true);
            }}
            disabled={isSubmitting}
          >
            Preview Quotation
          </Button>

          {currentUser?.role !== 'admin' ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              icon={Send}
              onClick={() => {
                if (validateForm()) {
                  setIsApprovalConfirmOpen(true);
                }
              }}
              isLoading={isSubmitting}
              style={{
                backgroundColor: '#b3261e',
                color: '#ffffff',
                fontWeight: 700
              }}
            >
              Send to Admin for Approval
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="lg"
              icon={FileCheck}
              onClick={() => handleSave(false)}
              isLoading={isSubmitting}
            >
              Save &amp; Finalize Quotation
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Modal: Send to Admin for Approval */}
      <Modal
        isOpen={isApprovalConfirmOpen}
        onClose={() => setIsApprovalConfirmOpen(false)}
        title="Confirm Quotation Submission"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsApprovalConfirmOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={Send}
              onClick={() => handleSave(false)}
              isLoading={isSubmitting}
              style={{
                backgroundColor: '#b3261e',
                color: '#ffffff',
                fontWeight: 700
              }}
            >
              Yes, Send to Admin
            </Button>
          </>
        }
      >
        <div style={{ padding: '8px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                color: '#b3261e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Send size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                Send to Admin for Approval?
              </h3>
              <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Aapka banaya hua quotation <strong>{quotationNo}</strong> (Customer: <strong>{selectedCustomer?.name || 'Customer'}</strong>, Amount: <strong>{formatCurrency(quotationFinancials.grandTotal)}</strong>) Admin review aur approval ke liye bhej diya jayega.
              </p>
              <div
                style={{
                  marginTop: '14px',
                  padding: '12px 14px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  color: '#64748b',
                  lineHeight: 1.4
                }}
              >
                ℹ️ <strong>Workflow Info:</strong> Admin is quotation ko <em>Authorized Users &amp; Staff</em> dossier me inspect karke Approve ya Reject karenge. Approve hone ke baad hi yeh confirm hoga.
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* On-Screen Quotation Preview Modal */}
      <QuotationPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        quotationData={{
          quotationNo,
          quotationDate,
          validUntilDate,
          referenceNo,
          subject,
          salesPerson: salesPerson || currentUser?.name || currentUser?.email || 'Authorized Staff',
          preparedBy: salesPerson || currentUser?.name || currentUser?.email || 'Authorized Staff',
          customer: {
            ...(selectedCustomer || {}),
            shippingAddress: shippingAddress || selectedCustomer?.shippingAddress || selectedCustomer?.billingAddress || '',
            shippingCity: shippingCity || selectedCustomer?.shippingCity || selectedCustomer?.city || '',
            shippingState: shippingState || selectedCustomer?.shippingState || selectedCustomer?.state || '',
            shippingPincode: shippingPincode || selectedCustomer?.shippingPincode || selectedCustomer?.pincode || '',
            shippingContactPerson: shippingContactPerson || selectedCustomer?.shippingContactPerson || selectedCustomer?.contactPerson || '',
            shippingPhone: shippingPhone || selectedCustomer?.shippingPhone || selectedCustomer?.phone || ''
          },
          items: quotationFinancials.items,
          orderNo: orderType === 'Purchase Order (PO)' ? (poNumber ? `PO: ${poNumber}` : 'PO') : (orderType === 'Other' ? (orderNo || 'Custom') : orderType),
          orderType,
          poNumber,
          dispatchDetails,
          currency: {
            code: quotationFinancials.currencyCode,
            symbol: quotationFinancials.currencySymbol,
            decimals: getCurrencyConfig(selectedCurrencyCode).decimals,
            exchangeRate: quotationFinancials.exchangeRate
          },
          taxTreatment: {
            type: taxTreatment,
            lutNumber: lutNumber
          },
          paymentTermsNote: customPaymentNote,
          selectedTerms: activeTermsText,
          overallDiscountPercent: overallDiscountPercent || 0,
          overallGstRate: overallGstRate || '18'
        }}
        calculatedTotals={quotationFinancials}
        company={company}
      />

      {/* Quick Add Customer Modal */}
      <Modal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        title="Quick Add Customer"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsNewCustomerModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleQuickCustomerSave}>
              Save &amp; Select Customer
            </Button>
          </>
        }
      >
        <form onSubmit={handleQuickCustomerSave} className="flex-col gap-16">
          {/* STEP 1: ORGANIZATION / CLIENT IDENTITY */}
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={13} /> 1. Client Legal Entity
            </div>
            <div className="form-grid-2">
              <Input
                label="Customer / Company Legal Name"
                value={newCustomerForm.name}
                onChange={(e) => {
                  setNewCustomerForm({ ...newCustomerForm, name: e.target.value });
                  if (newCustomerErrors.name) setNewCustomerErrors({ ...newCustomerErrors, name: '' });
                }}
                placeholder="e.g. Larsen & Toubro Limited"
                required
                error={newCustomerErrors.name}
              />
              <Input
                label="Site / Project / Branch Name"
                value={newCustomerForm.siteName || ''}
                onChange={(e) => {
                  setNewCustomerForm({ ...newCustomerForm, siteName: e.target.value });
                }}
                placeholder="e.g. Hazira Plant Expansion - Site 4"
                hint="Differentiates multiple locations for same company"
              />
            </div>
          </div>

          {/* STEP 2: TRADE JURISDICTION */}
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={13} /> 2. Country &amp; Jurisdiction
            </div>
            <div className="form-grid-2">
              <Select
                label="Country / Jurisdiction"
                value={newCustomerForm.country}
                onChange={(e) => {
                  const cVal = e.target.value;
                  setNewCustomerForm((prev) => ({
                    ...prev,
                    country: cVal,
                    state: cVal === 'India' ? (prev.state || 'Gujarat') : prev.state
                  }));
                }}
                options={COUNTRIES.map((c) => ({
                  value: c.name,
                  label: `${c.name}${c.code !== 'OTHER' ? ` (${c.code})` : ''}`
                }))}
                required
              />
              {newCustomerForm.country === 'OTHER' ? (
                <Input
                  label="Type Country Name"
                  value={newCustomerForm.customCountry}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, customCountry: e.target.value })}
                  placeholder="e.g. Netherlands, South Africa..."
                  required
                  error={newCustomerErrors.customCountry}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: 18 }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 10px',
                      borderRadius: 4,
                      fontSize: '11.5px',
                      fontWeight: 600,
                      backgroundColor: newCustomerForm.country === 'India' ? '#f0fdf4' : '#eff6ff',
                      color: newCustomerForm.country === 'India' ? '#15803d' : '#1d4ed8',
                      border: `1px solid ${newCustomerForm.country === 'India' ? '#bbf7d0' : '#bfdbfe'}`
                    }}
                  >
                    {newCustomerForm.country === 'India' ? <ShieldCheck size={13} /> : <Globe size={13} />}
                    <span>{newCustomerForm.country === 'India' ? 'Domestic Indian Client' : 'Zero-Rated Export (0% GST under LUT)'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STEP 3: LOCATION & BILLING ADDRESS */}
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={13} /> 3. Location &amp; Address
            </div>
            {newCustomerForm.country === 'India' ? (
              <div className="form-grid-3">
                <Select
                  label="State (Place of Supply)"
                  value={newCustomerForm.state}
                  onChange={(e) => {
                    setNewCustomerForm({ ...newCustomerForm, state: e.target.value });
                    if (newCustomerErrors.state) setNewCustomerErrors({ ...newCustomerErrors, state: '' });
                  }}
                  options={INDIAN_STATES.map((st) => ({ value: st, label: st }))}
                  required
                  error={newCustomerErrors.state}
                />
                <Input
                  label="City / Town"
                  value={newCustomerForm.city}
                  onChange={(e) => {
                    setNewCustomerForm({ ...newCustomerForm, city: e.target.value });
                    if (newCustomerErrors.city) setNewCustomerErrors({ ...newCustomerErrors, city: '' });
                  }}
                  placeholder="Mumbai"
                  required
                  error={newCustomerErrors.city}
                />
                <Input
                  label="Pincode"
                  value={newCustomerForm.pincode}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, pincode: e.target.value })}
                  placeholder="395007"
                />
              </div>
            ) : (
              <div className="form-grid-2">
                <Input
                  label="City / Region / Province (Optional)"
                  value={newCustomerForm.city}
                  onChange={(e) => {
                    setNewCustomerForm({ ...newCustomerForm, city: e.target.value });
                    if (newCustomerErrors.city) setNewCustomerErrors({ ...newCustomerErrors, city: '' });
                  }}
                  placeholder="e.g. Moscow / Dubai / London (or leave blank)"
                  hint="Type city/region if known, otherwise leave blank"
                />
                <Input
                  label="Postal / ZIP Code (Optional)"
                  value={newCustomerForm.pincode}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, pincode: e.target.value })}
                  placeholder="101000 / 90210"
                />
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <Input
                label="Full Address / Street Location (Optional)"
                value={newCustomerForm.billingAddress}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, billingAddress: e.target.value })}
                placeholder={newCustomerForm.country === 'India' ? "Full billing address..." : "Street, building, or general destination address..."}
                multiline
                rows={2}
              />
            </div>
          </div>

          {/* STEP 4: TAX IDENTIFIERS */}
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileCheck size={13} /> 4. Tax Identification
            </div>
            {newCustomerForm.country === 'India' ? (
              <Input
                label="GSTIN (15 Digits)"
                value={newCustomerForm.gstin}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, gstin: e.target.value.toUpperCase() })}
                placeholder="27AAACP9988C1Z4"
              />
            ) : (
              <Input
                label={`${getCountryConfig(newCustomerForm.country === 'OTHER' ? newCustomerForm.customCountry : newCustomerForm.country).taxLabel} (Optional)`}
                value={newCustomerForm.taxId}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, taxId: e.target.value })}
                placeholder="e.g. INN / VAT / TRN / Tax ID"
                hint="Foreign tax/VAT registration number if available"
              />
            )}
          </div>

          {/* STEP 5: CONTACT PERSON */}
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={13} /> 5. Contact Details
            </div>
            <div className="form-grid-3">
              <Input
                label="Contact Person"
                value={newCustomerForm.contactPerson}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, contactPerson: e.target.value })}
                placeholder={newCustomerForm.country === 'India' ? "Mr. Ramesh Gupta" : "Alexey Klimin / John Doe"}
              />
              <Input
                label="Phone Number"
                value={newCustomerForm.phone}
                onChange={(e) => {
                  setNewCustomerForm({ ...newCustomerForm, phone: e.target.value });
                  if (newCustomerErrors.phone) setNewCustomerErrors({ ...newCustomerErrors, phone: '' });
                }}
                placeholder={newCustomerForm.country === 'India' ? "+91 98200 99887" : "+7 999 123-4567 / +1 555-0199"}
                required
                error={newCustomerErrors.phone}
              />
              <Input
                label="Email Address"
                value={newCustomerForm.email}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                placeholder="procurement@company.com"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Equipment Image Lightbox Modal */}
      <ImageLightboxModal
        isOpen={Boolean(viewingImage)}
        onClose={() => setViewingImage(null)}
        imageUrl={viewingImage?.url}
        title={viewingImage?.title || 'Equipment Preview'}
      />

      {/* Currency Switch Confirmation Modal */}
      <Modal
        isOpen={currencySwitchModal.isOpen}
        onClose={handleCancelCurrencyChange}
        title={`Change Quotation Currency to ${currencySwitchModal.targetCurrencyCode}?`}
        size="md"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="secondary" onClick={handleCancelCurrencyChange}>
              Cancel Change
            </Button>
            <Button variant="secondary" onClick={handleConfirmCurrencyKeepRates}>
              Keep Same Numbers
            </Button>
            <Button variant="primary" onClick={handleConfirmCurrencyConvertRates}>
              Convert Unit Rates
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '13px', color: 'var(--color-text)' }}>
          <p>
            You are changing the quotation currency from <strong>{selectedCurrencyCode}</strong> to{' '}
            <strong>{currencySwitchModal.targetCurrencyCode}</strong>.
          </p>

          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#f8fafc',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-button)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <div style={{ fontWeight: 600 }}>Please choose how to handle current line items:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
              <div>
                <strong>1. Convert Unit Rates (Recommended):</strong> Re-calculates unit rates using the exchange rate (1 {currencySwitchModal.targetCurrencyCode} = ₹{currencySwitchModal.targetExchangeRate}).
              </div>
              <div>
                <strong>2. Keep Same Numbers:</strong> Leaves numeric values as-is (e.g., 5,800 {selectedCurrencyCode} becomes 5,800 {currencySwitchModal.targetCurrencyCode}).
              </div>
              <div>
                <strong>3. Cancel Change:</strong> Keeps current {selectedCurrencyCode} currency.
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
