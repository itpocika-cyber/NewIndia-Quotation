import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { QuotationPreviewModal } from '../quotation/QuotationPreviewModal';
import { formatCurrency, formatDisplayDate } from '../../utils/calculations';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  Phone,
  Mail,
  Eye,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  FileText,
  Globe,
  MapPin,
  ShieldCheck,
  FileCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useMasters } from '../../context/MastersContext';
import { useToast } from '../../context/ToastContext';
import { isRequired, isValidEmail, isValidPhone, isValidGSTIN, isValidPAN } from '../../utils/validation';
import { COUNTRIES, INDIAN_STATES, getCountryConfig } from '../../constants/countries';
import { Select } from '../../components/common/Select';

const ITEMS_PER_PAGE = 15;

const INITIAL_FORM = {
  name: '',
  siteName: '', // e.g. "Hazira Plant - Site 2"
  contactPerson: '',
  phone: '',
  email: '',
  country: 'India',
  customCountry: '',
  city: 'Surat',
  state: 'Gujarat',
  pincode: '',
  taxId: '',
  foreignRegNo: '',
  gstin: '',
  pan: '',
  billingAddress: '',
  shippingAddress: '',
  notes: ''
};

const STATUS_VARIANTS = {
  Draft: 'neutral',
  Sent: 'info',
  Pending: 'warning',
  Accepted: 'success',
  Rejected: 'danger',
  Expired: 'neutral',
  Cancelled: 'neutral'
};

export function CustomerMaster() {
  const { customers, quotations, company, addCustomer, updateCustomer, deleteCustomer } = useMasters();
  const { success, error } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('nameAsc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [previewingQuotation, setPreviewingQuotation] = useState(null);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered and sorted customer list
  const filteredCustomers = useMemo(() => {
    let result = customers || [];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.id?.toLowerCase().includes(term) ||
          c.name?.toLowerCase().includes(term) ||
          c.contactPerson?.toLowerCase().includes(term) ||
          c.phone?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.city?.toLowerCase().includes(term) ||
          c.state?.toLowerCase().includes(term) ||
          c.gstin?.toLowerCase().includes(term)
      );
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'nameAsc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'nameDesc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'idAsc') return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true });
      if (sortBy === 'idDesc') return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true });
      return 0;
    });
  }, [customers, searchTerm, sortBy]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  // Customer specific quotation history
  const customerQuotations = useMemo(() => {
    if (!viewingCustomer) return [];
    return quotations.filter(
      (q) => q.customer?.id === viewingCustomer.id || q.customer?.name === viewingCustomer.name
    );
  }, [quotations, viewingCustomer]);

  const customerStats = useMemo(() => {
    const totalCount = customerQuotations.length;
    let accepted = 0;
    let pending = 0;
    let rejected = 0;
    let totalValue = 0;

    customerQuotations.forEach((q) => {
      if (q.status === 'Accepted') accepted++;
      if (q.status === 'Pending' || q.status === 'Sent') pending++;
      if (q.status === 'Rejected') rejected++;
      totalValue += q.totals?.grandTotal || 0;
    });

    return { totalCount, accepted, pending, rejected, totalValue };
  }, [customerQuotations]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    const custCountry = customer.country || 'India';
    const isKnownCountry = COUNTRIES.some((c) => c.name.toLowerCase() === custCountry.toLowerCase());
    setFormData({
      name: customer.name || '',
      contactPerson: customer.contactPerson || '',
      phone: customer.phone || '',
      email: customer.email || '',
      country: isKnownCountry ? custCountry : 'OTHER',
      customCountry: !isKnownCountry && custCountry !== 'India' ? custCountry : '',
      billingAddress: customer.billingAddress || '',
      shippingAddress: customer.shippingAddress || '',
      city: customer.city || '',
      state: customer.state || (custCountry === 'India' ? 'Gujarat' : ''),
      pincode: customer.pincode || '',
      taxId: customer.taxId || '',
      foreignRegNo: customer.foreignRegNo || '',
      gstin: customer.gstin || '',
      pan: customer.pan || '',
      notes: customer.notes || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenView = (customer) => {
    setViewingCustomer(customer);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const effectiveCountry = formData.country === 'OTHER' ? (formData.customCountry || 'Other International Country') : formData.country;
  const isIndia = (formData.country || 'India').toLowerCase() === 'india';

  const validate = () => {
    const newErrors = {};

    if (!isRequired(formData.name)) newErrors.name = 'Customer name is required';
    if (!isRequired(formData.phone)) newErrors.phone = 'Phone number is required';
    else if (!isValidPhone(formData.phone)) newErrors.phone = 'Enter a valid phone number';

    if (formData.email && !isValidEmail(formData.email)) newErrors.email = 'Enter a valid email address';

    if (isIndia) {
      if (!isRequired(formData.city)) newErrors.city = 'City is required';
      if (!isRequired(formData.state)) newErrors.state = 'State is required (determines CGST/SGST vs IGST)';
      if (formData.gstin && !isValidGSTIN(formData.gstin)) newErrors.gstin = 'Enter a valid 15-digit GSTIN';
      if (formData.pan && !isValidPAN(formData.pan)) newErrors.pan = 'Enter a valid 10-digit PAN';
    } else {
      if (formData.country === 'OTHER' && !isRequired(formData.customCountry)) {
        newErrors.customCountry = 'Please type the country name';
      }
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      error('Validation Failed', 'Please fix all highlighted errors in red.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        country: effectiveCountry,
        state: isIndia ? formData.state : (formData.state || 'Overseas / Foreign')
      };
      delete payload.customCountry;

      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload);
        success('Customer Updated', `${formData.name} record has been saved.`);
      } else {
        const created = await addCustomer(payload);
        success('Customer Created', `${created.name} added with ID ${created.id}.`);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Customer save error:', err);
      const errMsg = err?.response?.data?.error || err?.message || 'Failed to save customer data.';
      error('Save Failed', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (customer) => {
    const hasQuotations = quotations.some(
      (q) => q.customer?.id === customer.id || q.customer?.name === customer.name
    );
    if (hasQuotations) {
      if (
        !window.confirm(
          `Customer ${customer.name} has existing quotation records. Are you sure you want to delete this customer?`
        )
      ) {
        return;
      }
    } else if (!window.confirm(`Delete customer ${customer.name}? This action cannot be undone.`)) {
      return;
    }

    deleteCustomer(customer.id);
    success('Customer Deleted', `${customer.name} has been removed.`);
  };

  return (
    <div className="flex-col gap-24">
      {/* Header bar & Search */}
      <div className="master-toolbar" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: '280px' }}>
          <div className="search-box" style={{ flex: 1, maxWidth: 360 }}>
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by ID, name, city, GSTIN..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 180 }}
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            title="Sort customers"
          >
            <option value="nameAsc">Sort: Name (A to Z)</option>
            <option value="nameDesc">Sort: Name (Z to A)</option>
            <option value="idAsc">Sort: Customer ID (Old to New)</option>
            <option value="idDesc">Sort: Customer ID (New to Old)</option>
          </select>
        </div>

        <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
          Add Customer
        </Button>
      </div>

      {/* Customer List Card */}
      <Card>
        <CardHeader
          title={`Client & Customer Directory (${filteredCustomers.length})`}
          description="Verified client directory with billing details, GSTIN records, and quotation history"
        />
        {filteredCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={searchTerm ? 'No matching customers found' : 'No customers in registry'}
            description={
              searchTerm
                ? `No customer records matched your query "${searchTerm}". Try a different keyword.`
                : 'Add your first customer to start issuing quotations.'
            }
            actionLabel={searchTerm ? 'Clear Search' : '+ Add Customer'}
            onAction={searchTerm ? () => setSearchTerm('') : handleOpenAdd}
          />
        ) : (
          <>
            <div
              className="table-responsive-wrapper"
              style={{
                width: '100%',
                overflowX: 'auto',
                maxHeight: '580px',
                overflowY: 'auto'
              }}
            >
              <Table style={{ width: '100%', minWidth: '820px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--color-surface, #ffffff)' }}>
                  <tr>
                    <th style={{ width: '55px', textAlign: 'center', whiteSpace: 'nowrap' }}>#</th>
                    <th style={{ width: '12%', whiteSpace: 'nowrap' }}>Customer ID</th>
                    <th style={{ width: '32%' }}>Customer Name &amp; Contact</th>
                    <th style={{ width: '16%' }}>Contact Person</th>
                    <th style={{ width: '16%' }}>Location &amp; State</th>
                    <th style={{ width: '12%' }}>GSTIN</th>
                    <th style={{ width: '12%', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.map((customer, index) => {
                    const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                    return (
                      <tr key={customer.id}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                          {rowNumber}
                        </td>
                        <td>
                          <Badge variant="neutral">{customer.id}</Badge>
                        </td>
                        <td>
                          <div className="text-bold" style={{ fontSize: '13.5px', color: 'var(--color-text)' }}>
                            {customer.name}
                          </div>
                          {customer.siteName && (
                            <div style={{ marginTop: 2 }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#1e40af',
                                  backgroundColor: '#dbeafe',
                                  padding: '1px 6px',
                                  borderRadius: '3px',
                                  display: 'inline-block'
                                }}
                              >
                                Site: {customer.siteName}
                              </span>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: 4, flexWrap: 'wrap' }}>
                            {customer.phone && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '11.5px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                                <Phone size={12} />
                                {customer.phone}
                              </span>
                            )}
                            {customer.email && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '11.5px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                                <Mail size={12} />
                                {customer.email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{customer.contactPerson || '-'}</td>
                        <td>
                          <div>{customer.city ? `${customer.city}, ${customer.state}` : customer.state}</div>
                          {customer.pincode && <div className="text-caption">PIN: {customer.pincode}</div>}
                        </td>
                        <td>
                          {customer.gstin ? (
                            <span className="badge badge-info">{customer.gstin}</span>
                          ) : (
                            <span className="text-subtle">Unregistered</span>
                          )}
                        </td>
                        <td>
                          <div className="table-actions">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Eye}
                              onClick={() => handleOpenView(customer)}
                              title="View Profile & Quotation History"
                            >
                              History
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Edit2}
                              onClick={() => handleOpenEdit(customer)}
                              title="Edit Customer"
                            />
                            <Button
                              variant="danger"
                              size="sm"
                              icon={Trash2}
                              onClick={() => handleDelete(customer)}
                              title="Delete Customer"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>

            {filteredCustomers.length > ITEMS_PER_PAGE && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderTop: '1px solid var(--color-border)',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div className="text-caption text-muted">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)} of{' '}
                  {filteredCustomers.length} customers
                </div>

                <div className="flex items-center gap-8">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ChevronLeft}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </Button>
                  <span className="text-caption" style={{ padding: '0 8px' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ChevronRight}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* 1. Add / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? `Edit Customer — ${editingCustomer.id}` : 'Register New Customer'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
              {editingCustomer ? 'Save Changes' : 'Create Customer'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="flex-col gap-16">
          {/* STEP 1: ORGANIZATION / CLIENT IDENTITY */}
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={15} style={{ flexShrink: 0 }} /> 1. Client Identity &amp; Legal Entity
            </div>
            <div className="form-grid-2">
              <Input
                label="Customer / Organization Legal Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Larsen & Toubro Limited"
                required
                error={formErrors.name}
              />
              <Input
                label="Site / Project / Branch Name (Optional)"
                name="siteName"
                value={formData.siteName || ''}
                onChange={handleChange}
                placeholder="e.g. Hazira Plant Expansion - Site 4"
                hint="Differentiates multiple locations for the same corporate entity"
              />
            </div>
          </div>

          {/* STEP 2: COUNTRY & JURISDICTION (Determines subsequent fields) */}
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={15} style={{ flexShrink: 0 }} /> 2. Country &amp; Trade Jurisdiction
            </div>
            <div className="form-grid-2">
              <Select
                label="Country / Jurisdiction"
                name="country"
                value={formData.country}
                onChange={(e) => {
                  const newCountry = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    country: newCountry,
                    state: newCountry === 'India' ? (prev.state || 'Gujarat') : prev.state
                  }));
                  if (formErrors.country) setFormErrors((prev) => ({ ...prev, country: '' }));
                }}
                options={COUNTRIES.map((c) => ({
                  value: c.name,
                  label: `${c.name}${c.code !== 'OTHER' ? ` (${c.code})` : ''}`
                }))}
                required
              />
              {formData.country === 'OTHER' ? (
                <Input
                  label="Specify Country Name"
                  name="customCountry"
                  value={formData.customCountry}
                  onChange={handleChange}
                  placeholder="e.g. Netherlands, South Africa, etc."
                  required
                  error={formErrors.customCountry}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: 18 }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: isIndia ? '#f0fdf4' : '#eff6ff',
                      color: isIndia ? '#15803d' : '#1d4ed8',
                      border: `1px solid ${isIndia ? '#bbf7d0' : '#bfdbfe'}`
                    }}
                  >
                    {isIndia ? <ShieldCheck size={15} style={{ flexShrink: 0 }} /> : <Globe size={15} style={{ flexShrink: 0 }} />}
                    <span>{isIndia ? 'Domestic Client (Standard Indian GST Rules)' : 'International Client (0% Export of Goods under LUT / Bond)'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STEP 3: LOCATION & BILLING ADDRESS (Ordered: State/Province -> City -> Zip -> Address) */}
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={15} style={{ flexShrink: 0 }} /> 3. Geographic Location &amp; Address
            </div>
            {isIndia ? (
              <div className="form-grid-3">
                <Select
                  label="State (Place of Supply for GST)"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  options={INDIAN_STATES.map((st) => ({ value: st, label: st }))}
                  required
                  error={formErrors.state}
                />
                <Input
                  label="City / Town"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Surat / Mumbai"
                  required
                  error={formErrors.city}
                />
                <Input
                  label="Pincode (6 Digits)"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="395007"
                />
              </div>
            ) : (
              <div className="form-grid-2">
                <Input
                  label="City / Region / Province (Optional)"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Moscow / Dubai / London (or leave blank)"
                  hint="Type city/region if known, otherwise leave blank"
                />
                <Input
                  label="Postal / ZIP Code (Optional)"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="101000 / 90210"
                  hint="International postal code if available"
                />
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <Input
                label="Full Address / Street Location (Optional)"
                name="billingAddress"
                value={formData.billingAddress}
                onChange={handleChange}
                placeholder={isIndia ? "Office suite, street, landmark..." : "Street, building, or general destination address..."}
                multiline
                rows={2}
              />
            </div>
          </div>

          {/* STEP 4: STATUTORY & TAX IDENTIFICATION */}
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileCheck size={15} style={{ flexShrink: 0 }} /> 4. Statutory &amp; Tax Identification
            </div>
            {isIndia ? (
              <div className="form-grid-2">
                <Input
                  label="GSTIN (15 Digits)"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  placeholder="24AAACS1234D1Z8"
                  error={formErrors.gstin}
                />
                <Input
                  label="PAN Number (10 Digits)"
                  name="pan"
                  value={formData.pan}
                  onChange={handleChange}
                  placeholder="AAACS1234D"
                  error={formErrors.pan}
                />
              </div>
            ) : (
              <div className="form-grid-2">
                <Input
                  label={`${getCountryConfig(effectiveCountry).taxLabel} (Optional)`}
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleChange}
                  placeholder="e.g. INN 7707083893 / TRN 100234567800003"
                  hint="Official foreign VAT or Tax Registration Number"
                />
                <Input
                  label={`${getCountryConfig(effectiveCountry).idLabel} (Optional)`}
                  name="foreignRegNo"
                  value={formData.foreignRegNo}
                  onChange={handleChange}
                  placeholder="e.g. OGRN / Trade License No. / Reg ID"
                  hint="Business Incorporation / Commercial Registration"
                />
              </div>
            )}
          </div>

          {/* STEP 5: CONTACT PERSON & COMMUNICATION */}
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={15} /> 5. Key Contact &amp; Communication
            </div>
            <div className="form-grid-3">
              <Input
                label="Contact Person Name"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange}
                placeholder={isIndia ? "Mr. Harshil Shah" : "Alexey Klimin / John Doe"}
              />
              <Input
                label="Phone / Mobile Number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder={isIndia ? "+91 98251 22334" : "+7 999 123-45-67 / +1 555-0199"}
                required
                error={formErrors.phone}
              />
              <Input
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="procurement@company.com"
                error={formErrors.email}
              />
            </div>
          </div>

          {/* STEP 6: INTERNAL NOTES */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={15} /> 6. Commercial Terms &amp; Internal Notes
            </div>
            <Input
              label="Internal Notes / Commercial Terms (Optional)"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Special delivery instructions, AMC records, payment follow-up..."
              multiline
              rows={2}
            />
          </div>
        </form>
      </Modal>

      {/* 2. Customer Profile & Quotation History Modal */}
      {viewingCustomer && (
        <Modal
          isOpen={Boolean(viewingCustomer)}
          onClose={() => setViewingCustomer(null)}
          title={`Customer Profile & History — ${viewingCustomer.name}`}
          size="xl"
          footer={
            <Button variant="primary" onClick={() => setViewingCustomer(null)}>
              Close
            </Button>
          }
        >
          <div className="flex-col gap-24">
            {/* Overview Profile Card */}
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-button)',
                backgroundColor: 'var(--color-surface-hover)',
                border: '1px solid var(--color-border)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16
              }}
            >
              <div>
                <div className="text-caption text-muted">Organization &amp; Jurisdiction</div>
                <div className="text-bold" style={{ fontSize: '15px', marginTop: 2 }}>{viewingCustomer.name}</div>
                <div className="text-caption text-muted" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  {viewingCustomer.country && viewingCustomer.country.toLowerCase() !== 'india' ? (
                    <span style={{ color: '#1d4ed8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Globe size={12} /> {viewingCustomer.country}
                    </span>
                  ) : (
                    <span style={{ color: '#15803d', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ShieldCheck size={12} /> India
                    </span>
                  )}
                  <span>|</span>
                  <span>{viewingCustomer.id}</span>
                  {viewingCustomer.city && <span>| {viewingCustomer.city}</span>}
                </div>
              </div>

              <div>
                <div className="text-caption text-muted">Primary Contact</div>
                <div className="text-bold" style={{ marginTop: 2 }}>{viewingCustomer.contactPerson || '-'}</div>
                <div className="text-caption text-muted">{viewingCustomer.phone || '-'} | {viewingCustomer.email || '-'}</div>
              </div>

              <div>
                <div className="text-caption text-muted">Statutory &amp; Tax Identifiers</div>
                {viewingCustomer.country && viewingCustomer.country.toLowerCase() !== 'india' ? (
                  <>
                    <div><strong>Tax ID / VAT:</strong> <code>{viewingCustomer.taxId || viewingCustomer.gstin || 'Not Provided'}</code></div>
                    {viewingCustomer.foreignRegNo && <div><strong>Reg No:</strong> <code>{viewingCustomer.foreignRegNo}</code></div>}
                  </>
                ) : (
                  <>
                    <div><strong>GSTIN:</strong> <code>{viewingCustomer.gstin || 'Unregistered'}</code></div>
                    <div><strong>PAN:</strong> <code>{viewingCustomer.pan || '-'}</code></div>
                  </>
                )}
              </div>
            </div>

            {/* Quotation Metrics Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: 6, textAlign: 'center', backgroundColor: '#fff' }}>
                <div className="text-caption text-muted">Total Quotations</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: 4 }}>{customerStats.totalCount}</div>
              </div>
              <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: 6, textAlign: 'center', backgroundColor: '#fff' }}>
                <div className="text-caption text-muted">Accepted</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: 4, color: 'var(--color-success)' }}>{customerStats.accepted}</div>
              </div>
              <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: 6, textAlign: 'center', backgroundColor: '#fff' }}>
                <div className="text-caption text-muted">Pending / Sent</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: 4, color: 'var(--color-warning)' }}>{customerStats.pending}</div>
              </div>
              <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: 6, textAlign: 'center', backgroundColor: '#fff' }}>
                <div className="text-caption text-muted">Rejected</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: 4, color: 'var(--color-danger)' }}>{customerStats.rejected}</div>
              </div>
              <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: 6, textAlign: 'center', backgroundColor: '#fff' }}>
                <div className="text-caption text-muted">Total Value (INR)</div>
                <div style={{ fontSize: '18px', fontWeight: 700, marginTop: 4, color: 'var(--color-primary)' }}>
                  {formatCurrency(customerStats.totalValue)}
                </div>
              </div>
            </div>

            {/* Customer Quotation History Table */}
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <h3 className="heading-sub" style={{ fontSize: '15px' }}>Quotation History Records</h3>
                <Badge variant="neutral">{customerQuotations.length} quotes</Badge>
              </div>

              {customerQuotations.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: 6, color: 'var(--color-text-muted)' }}>
                  No quotations have been prepared for this customer yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 6 }}>
                  <Table>
                    <thead>
                      <tr>
                        <th>Quotation No</th>
                        <th>Date</th>
                        <th>Subject / Project</th>
                        <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerQuotations.map((q) => (
                        <tr key={q.quotationNo}>
                          <td>
                            <span className="text-bold" style={{ color: 'var(--color-primary)' }}>
                              {q.quotationNo}
                            </span>
                          </td>
                          <td>{formatDisplayDate(q.quotationDate)}</td>
                          <td>
                            <div style={{ maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {q.subject || 'Supply of Fire Protection Equipment'}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {formatCurrency(q.totals?.grandTotal || 0)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <Badge variant={STATUS_VARIANTS[q.status] || 'neutral'}>
                              {q.status || 'Draft'}
                            </Badge>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Eye}
                              onClick={() => setPreviewingQuotation(q)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Quotation Preview Modal from History */}
      {previewingQuotation && (
        <QuotationPreviewModal
          isOpen={Boolean(previewingQuotation)}
          onClose={() => setPreviewingQuotation(null)}
          quotationData={previewingQuotation}
          company={company}
        />
      )}
    </div>
  );
}
