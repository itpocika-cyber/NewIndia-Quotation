import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { EmptyState } from '../../components/common/EmptyState';
import { QuotationPreviewModal } from './QuotationPreviewModal';
import { formatCurrency, formatDisplayDate } from '../../utils/calculations';
import { useMasters } from '../../context/MastersContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { generateQuotationPDF } from '../../utils/pdfGenerator';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Copy,
  Download,
  Printer,
  RotateCw,
  FileSpreadsheet,
  Calendar,
  User,
  Phone,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  FileText,
  Trash2,
  GitBranch,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  Lock
} from 'lucide-react';

const STATUS_VARIANTS = {
  Draft: 'neutral',
  Sent: 'info',
  Pending: 'warning',
  Approved: 'success',
  Accepted: 'success',
  Rejected: 'danger',
  Expired: 'neutral',
  Cancelled: 'neutral'
};

const ITEMS_PER_PAGE = 10;

export function QuotationList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { quotations, company, updateQuotationStatus, deleteQuotation, duplicateQuotation, createRevision } = useMasters();
  const { success, error, info } = useToast();

  // Filter & Search State
  const initialStatusTab = searchParams.get('status') || 'ALL';
  const initialStaffParam = searchParams.get('staff') || 'ALL';
  const [activeTab, setActiveTab] = useState(initialStatusTab);
  const [selectedStaff, setSelectedStaff] = useState(initialStaffParam);

  // Sync activeTab & selectedStaff when URL search params change
  useEffect(() => {
    const statusParam = searchParams.get('status') || 'ALL';
    const staffParam = searchParams.get('staff') || 'ALL';
    setActiveTab(statusParam);
    setSelectedStaff(staffParam);
    setCurrentPage(1);
  }, [searchParams]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterSalesPerson, setFilterSalesPerson] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals State
  const [previewingQuotation, setPreviewingQuotation] = useState(null);
  const [statusModalQuotation, setStatusModalQuotation] = useState(null);
  const [deletingQuotation, setDeletingQuotation] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [downloadingPDFNo, setDownloadingPDFNo] = useState(null);

  // Admin Remark & Send Back for Modification Modal
  const [returningQuotation, setReturningQuotation] = useState(null);
  const [adminRemark, setAdminRemark] = useState('');

  const [selectedRevisionHistoryQuotation, setSelectedRevisionHistoryQuotation] = useState(null);

  // Unique customer & sales person lists for filters
  const uniqueCustomers = useMemo(() => {
    const names = new Set(quotations.map((q) => q.customer?.name).filter(Boolean));
    return Array.from(names);
  }, [quotations]);

  const uniqueSalesPersons = useMemo(() => {
    const persons = new Set(
      quotations
        .map((q) => q.preparedBy || q.salesPerson || q.createdByName || q.createdBy?.name)
        .filter(Boolean)
    );
    return Array.from(persons);
  }, [quotations]);

  // Tab counts (only counting active latest quotations, superseded versions stay inside history):
  const tabCounts = useMemo(() => {
    const supersededNos = new Set();
    quotations.forEach((q) => {
      if (Array.isArray(q.revisionHistory)) {
        q.revisionHistory.forEach((rev) => {
          if (rev.quotationNo) supersededNos.add(rev.quotationNo);
        });
      }
    });

    const activeList = quotations.filter((q) => !supersededNos.has(q.quotationNo));
    const counts = { ALL: activeList.length, Draft: 0, Sent: 0, Pending: 0, Accepted: 0, Rejected: 0 };
    activeList.forEach((q) => {
      const st = q.status || 'Draft';
      if (st === 'Approved' || st === 'Sent') {
        counts.Sent++;
      } else if (counts[st] !== undefined) {
        counts[st]++;
      }
    });
    return counts;
  }, [quotations]);

  // Staff counts for admin quick selector
  const staffCounts = useMemo(() => {
    const counts = { ALL: quotations.length };
    quotations.forEach((q) => {
      const author = q.preparedBy || q.salesPerson || q.createdByName || q.createdBy?.name || 'Unassigned';
      counts[author] = (counts[author] || 0) + 1;
    });
    return counts;
  }, [quotations]);

  // Filtered and sorted quotations
  // In professional ERPs, the main table displays only the latest active quotation (e.g. QT-2026-0014-R1).
  // Superseded historical versions (QT-2026-0014) are accessed cleanly via the Revision badge popup.
  const filteredQuotations = useMemo(() => {
    // 1. Identify which quotations are superseded by a newer revision
    const supersededNos = new Set();
    quotations.forEach((q) => {
      if (Array.isArray(q.revisionHistory)) {
        q.revisionHistory.forEach((rev) => {
          if (rev.quotationNo) {
            supersededNos.add(rev.quotationNo);
          }
        });
      }
    });

    return quotations
      .filter((q) => {
        // Exclude older historical revisions from cluttering the main table
        if (supersededNos.has(q.quotationNo)) {
          return false;
        }

        // Admin Staff Filter Pill
        if (isAdmin && selectedStaff !== 'ALL') {
          const author = q.preparedBy || q.salesPerson || q.createdByName || q.createdBy?.name || 'Unassigned';
          if (author !== selectedStaff) return false;
        }

        // Tab Filter
        if (activeTab !== 'ALL') {
          if (activeTab === 'Sent') {
            if (q.status !== 'Sent' && q.status !== 'Approved') return false;
          } else {
            if (q.status !== activeTab) return false;
          }
        }

        // Search Term (Quotation No, Customer Name, Phone)
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchNo = q.quotationNo?.toLowerCase().includes(term);
          const matchCustomer = q.customer?.name?.toLowerCase().includes(term);
          const matchPhone = q.customer?.phone?.toLowerCase().includes(term);
          const matchRef = q.referenceNo?.toLowerCase().includes(term);
          if (!matchNo && !matchCustomer && !matchPhone && !matchRef) return false;
        }

        // Date Range
        if (filterStartDate && q.quotationDate < filterStartDate) return false;
        if (filterEndDate && q.quotationDate > filterEndDate) return false;

        // Customer
        if (filterCustomer && q.customer?.name !== filterCustomer) return false;

        // Sales Person / Prepared By
        if (filterSalesPerson) {
          const author = q.preparedBy || q.salesPerson || q.createdByName || q.createdBy?.name;
          if (author !== filterSalesPerson) return false;
        }

        // Amount Range
        const amount = q.totals?.grandTotal ?? (q.financials?.grandTotal ?? 0);
        if (filterMinAmount && amount < parseFloat(filterMinAmount)) return false;
        if (filterMaxAmount && amount > parseFloat(filterMaxAmount)) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.quotationDate || b.savedAt) - new Date(a.quotationDate || a.savedAt);
        if (sortBy === 'oldest') return new Date(a.quotationDate || a.savedAt) - new Date(b.quotationDate || b.savedAt);
        if (sortBy === 'highest') return (b.totals?.grandTotal || b.financials?.grandTotal || 0) - (a.totals?.grandTotal || a.financials?.grandTotal || 0);
        if (sortBy === 'lowest') return (a.totals?.grandTotal || a.financials?.grandTotal || 0) - (b.totals?.grandTotal || b.financials?.grandTotal || 0);
        return 0;
      });
  }, [
    quotations,
    isAdmin,
    selectedStaff,
    activeTab,
    searchTerm,
    filterStartDate,
    filterEndDate,
    filterCustomer,
    filterSalesPerson,
    filterMinAmount,
    filterMaxAmount,
    sortBy
  ]);

  // Pagination slice
  const totalPages = Math.ceil(filteredQuotations.length / ITEMS_PER_PAGE) || 1;
  const paginatedQuotations = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQuotations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredQuotations, currentPage]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setCurrentPage(1);
    setSearchParams(tabKey === 'ALL' ? {} : { status: tabKey });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterCustomer('');
    setFilterSalesPerson('');
    setFilterMinAmount('');
    setFilterMaxAmount('');
    setSortBy('newest');
    setActiveTab('ALL');
    setSearchParams({});
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    Boolean(filterStartDate) ||
    Boolean(filterEndDate) ||
    Boolean(filterCustomer) ||
    Boolean(filterSalesPerson) ||
    Boolean(filterMinAmount) ||
    Boolean(filterMaxAmount) ||
    activeTab !== 'ALL';

  // Action Handlers
  const handleEdit = (q) => {
    navigate('/quotations/create', { state: { editQuotation: q } });
  };

  const [duplicatingNo, setDuplicatingNo] = useState(null);
  const [revisingNo, setRevisingNo] = useState(null);

  const handleDuplicate = async (q) => {
    if (duplicatingNo) return; // Prevent multiple clicks
    try {
      setDuplicatingNo(q.quotationNo);
      info('Duplicating Quotation', `Creating copy of ${q.quotationNo}...`);
      const duplicated = await duplicateQuotation(q.quotationNo);
      if (duplicated) {
        success('Quotation Duplicated', `Created draft ${duplicated.quotationNo} from ${q.quotationNo}.`);
        navigate('/quotations/create', { state: { editQuotation: duplicated } });
      }
    } catch (err) {
      console.error('Duplicate error:', err);
      error('Duplicate Failed', err?.message || 'Could not duplicate quotation.');
      setDuplicatingNo(null);
    }
  };

  const handleRevision = async (q) => {
    if (revisingNo) return;
    try {
      setRevisingNo(q.quotationNo);
      info('Branching Revision', `Creating new revision for ${q.quotationNo}...`);
      const revisionDoc = await createRevision(q.quotationNo);
      if (revisionDoc) {
        success('Revision Created', `Opened revision ${revisionDoc.quotationNo} (${revisionDoc.revisionLabel}).`);
        navigate('/quotations/create', { state: { editQuotation: revisionDoc } });
      }
    } catch (err) {
      console.error('Revision error:', err);
      error('Revision Failed', err?.message || 'Could not branch quotation revision.');
      setRevisingNo(null);
    }
  };

  const handleQuickApprove = async (q) => {
    try {
      await updateQuotationStatus(q.quotationNo, 'Sent', 'Approved & Sent to Client by Admin');
      success('Quotation Approved & Sent', `Quotation ${q.quotationNo} approved and marked Sent to client.`);
    } catch (err) {
      error('Approval Failed', err?.message || 'Could not approve quotation.');
    }
  };

  const handleReturnForChanges = async (e) => {
    e.preventDefault();
    if (!returningQuotation) return;
    try {
      await updateQuotationStatus(returningQuotation.quotationNo, 'Pending', adminRemark || 'Returned by Admin for corrections');
      success('Sent Back with Remarks', `${returningQuotation.quotationNo} returned to staff for revision.`);
      setReturningQuotation(null);
      setAdminRemark('');
    } catch (err) {
      error('Update Failed', err?.message || 'Could not return quotation.');
    }
  };

  const handleOpenStatusModal = (q) => {
    setStatusModalQuotation(q);
    setNewStatus(q.status || 'Sent');
    setStatusNote('');
  };

  const handleSaveStatus = (e) => {
    e.preventDefault();
    if (!statusModalQuotation) return;
    updateQuotationStatus(statusModalQuotation.quotationNo, newStatus, statusNote);
    success('Status Updated', `${statusModalQuotation.quotationNo} changed to ${newStatus}.`);
    setStatusModalQuotation(null);
  };

  const handleDeleteConfirm = () => {
    if (!deletingQuotation) return;
    deleteQuotation(deletingQuotation.quotationNo);
    success('Quotation Deleted', `${deletingQuotation.quotationNo} removed.`);
    setDeletingQuotation(null);
  };

  const handleDirectDownloadPDF = async (q) => {
    try {
      setDownloadingPDFNo(q.quotationNo);
      info('Generating PDF', `Preparing ${q.quotationNo} via Puppeteer...`);
      await generateQuotationPDF(null, q);
      success('PDF Downloaded', `Saved as ${q.quotationNo}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
      error('PDF Failed', err.message || 'Could not generate quotation PDF.');
    } finally {
      setDownloadingPDFNo(null);
    }
  };

  return (
    <div className="flex-col gap-24">
      {/* Top Toolbar */}
      <div className="quotation-top-bar">
        <div className="flex items-center gap-12" style={{ flexWrap: 'wrap' }}>
          <h2 className="heading-sub">Quotation Register</h2>
          <Badge variant="neutral">{filteredQuotations.length} {filteredQuotations.length === 1 ? 'record' : 'records'}</Badge>
        </div>

        <div className="quotation-top-actions">
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => navigate('/quotations/create')}
          >
            Create Quotation
          </Button>
        </div>
      </div>

      {/* Admin Exclusive: Staff Portfolio Selector Bar */}
      {isAdmin && uniqueSalesPersons.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflowX: 'auto'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
            <User size={15} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
              Staff Filter:
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedStaff('ALL');
              setCurrentPage(1);
            }}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: selectedStaff === 'ALL' ? 700 : 500,
              border: selectedStaff === 'ALL' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              backgroundColor: selectedStaff === 'ALL' ? 'var(--color-primary)' : 'transparent',
              color: selectedStaff === 'ALL' ? '#ffffff' : 'var(--color-text)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>All Staff</span>
            <span
              style={{
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '10px',
                backgroundColor: selectedStaff === 'ALL' ? 'rgba(255,255,255,0.25)' : 'var(--color-surface-hover)',
                color: selectedStaff === 'ALL' ? '#ffffff' : 'var(--color-text-muted)'
              }}
            >
              {quotations.length}
            </span>
          </button>

          {uniqueSalesPersons.map((staffName) => {
            const isSelected = selectedStaff === staffName;
            const count = staffCounts[staffName] || 0;
            return (
              <button
                key={staffName}
                type="button"
                onClick={() => {
                  setSelectedStaff(staffName);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                  color: isSelected ? '#ffffff' : 'var(--color-text)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{staffName}</span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--color-surface-hover)',
                    color: isSelected ? '#ffffff' : 'var(--color-text-muted)'
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Tabs & Search Bar Card */}
      <Card>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--color-border)',
            padding: '0 16px',
            overflowX: 'auto',
            gap: 8
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {[
              { id: 'ALL', label: 'All Quotations', count: tabCounts.ALL },
              { id: 'Draft', label: 'Drafts', count: tabCounts.Draft },
              { id: 'Sent', label: 'Sent / Approved', count: tabCounts.Sent },
              { id: 'Pending', label: 'Review / Changes', count: tabCounts.Pending },
              { id: 'Accepted', label: 'Accepted (Confirmed)', count: tabCounts.Accepted },
              { id: 'Rejected', label: 'Rejected', count: tabCounts.Rejected }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                style={{
                  padding: '12px 14px',
                  border: 'none',
                  background: 'none',
                  fontSize: '13px',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    backgroundColor: activeTab === tab.id ? 'var(--color-primary-light)' : 'var(--color-surface-hover)',
                    color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-muted)'
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <Button
            variant={isFilterDrawerOpen ? 'primary' : 'ghost'}
            size="sm"
            icon={Filter}
            onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
          >
            Filters {hasActiveFilters && '(Active)'}
          </Button>
        </div>

        {/* Filter Controls (Collapsible Drawer / Bar) */}
        {isFilterDrawerOpen && (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--color-surface-hover)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <div className="form-grid">
              <div>
                <label className="form-label">Search Keyword</label>
                <div className="search-box">
                  <Search className="search-icon" size={16} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Quotation No, Customer, Phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Customer Filter</label>
                <select
                  className="form-select"
                  value={filterCustomer}
                  onChange={(e) => setFilterCustomer(e.target.value)}
                >
                  <option value="">All Customers</option>
                  {uniqueCustomers.map((c, i) => (
                    <option key={i} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Sales Person</label>
                <select
                  className="form-select"
                  value={filterSalesPerson}
                  onChange={(e) => setFilterSalesPerson(e.target.value)}
                >
                  <option value="">All Sales Reps</option>
                  {uniqueSalesPersons.map((sp, i) => (
                    <option key={i} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Sort Order</label>
                <select
                  className="form-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="highest">Highest Amount</option>
                  <option value="lowest">Lowest Amount</option>
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div>
                <label className="form-label">From Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">To Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Min Amount (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  className="form-input"
                  value={filterMinAmount}
                  onChange={(e) => setFilterMinAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Max Amount (₹)</label>
                <input
                  type="number"
                  placeholder="Unlimited"
                  className="form-input"
                  value={filterMaxAmount}
                  onChange={(e) => setFilterMaxAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
              <span className="text-caption text-muted">
                Showing {filteredQuotations.length} matching quotations
              </span>
              <div className="flex items-center gap-8">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Clear All Filters
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsFilterDrawerOpen(false)}
                >
                  Close Filter Panel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Search Bar (when filter drawer is closed) */}
        {!isFilterDrawerOpen && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="search-box" style={{ flex: 1 }}>
              <Search className="search-icon" size={16} />
              <input
                type="text"
                className="form-input"
                placeholder="Quick search by quotation number, client name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {searchTerm && (
              <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>
                Clear
              </Button>
            )}
          </div>
        )}

        {/* Empty State */}
        {filteredQuotations.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title={hasActiveFilters ? 'No quotations match your filters' : 'No quotations registered yet'}
            description={
              hasActiveFilters
                ? 'Try adjusting or clearing your search filters to view more records.'
                : 'Create your first GST fire safety quotation using the button below.'
            }
            actionLabel={hasActiveFilters ? 'Reset Filters' : '+ Create New Quotation'}
            onAction={hasActiveFilters ? handleClearFilters : () => navigate('/quotations/create')}
          />
        ) : (
          <>
            {/* Unified Horizontally Slideable Quotation Table (All Resolutions) */}
            <div className="table-responsive-wrapper">
              <Table style={{ minWidth: '1240px', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '160px', minWidth: '160px', whiteSpace: 'nowrap' }}>Quotation No</th>
                    <th style={{ minWidth: '220px' }}>Customer (Buyer)</th>
                    <th style={{ width: '115px', minWidth: '115px', textAlign: 'center', whiteSpace: 'nowrap' }}>Date</th>
                    <th style={{ width: '115px', minWidth: '115px', textAlign: 'center', whiteSpace: 'nowrap' }}>Valid Till</th>
                    <th style={{ width: '135px', minWidth: '135px', textAlign: 'right', whiteSpace: 'nowrap' }}>Amount (₹)</th>
                    <th style={{ width: '110px', minWidth: '110px', textAlign: 'center', whiteSpace: 'nowrap' }}>Status</th>
                    <th style={{ width: '170px', minWidth: '170px', whiteSpace: 'nowrap' }}>Prepared By</th>
                    <th style={{ width: '235px', minWidth: '235px', textAlign: 'right', paddingRight: '16px', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedQuotations.map((q) => (
                    <tr key={q.quotationNo}>
                      <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="text-bold" style={{ color: 'var(--color-primary)', display: 'inline-block', whiteSpace: 'nowrap', fontSize: '13.5px' }}>
                            {q.quotationNo}
                          </span>
                          {(q.revisionLabel || (q.quotationNo && q.quotationNo.includes('-R')) || (q.revisionHistory && q.revisionHistory.length > 0)) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRevisionHistoryQuotation(q);
                              }}
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '1.5px 7px',
                                borderRadius: '4px',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fcd34d',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                lineHeight: '14px',
                                verticalAlign: 'middle',
                                flexShrink: 0
                              }}
                              title="Click to view all version revisions & history"
                            >
                              <GitBranch size={11} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                              <span style={{ letterSpacing: '0.2px' }}>{q.revisionLabel || q.quotationNo.match(/-R\d+$/)?.[0] || 'Rev'}</span>
                            </button>
                          )}
                        </div>
                        {q.referenceNo && (
                          <div className="text-caption text-muted" style={{ fontSize: '11px', whiteSpace: 'nowrap', marginTop: '2px' }}>
                            Ref: {q.referenceNo}
                          </div>
                        )}
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <div className="text-bold" style={{ fontSize: '13.5px' }}>{q.customer?.name || 'Customer'}</div>
                        <div className="text-caption text-muted" style={{ fontSize: '11.5px', marginTop: 2 }}>
                          {q.customer?.city ? `${q.customer.city}, ${q.customer.state}` : q.customer?.phone || '-'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '12.5px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        {formatDisplayDate(q.quotationDate)}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '12.5px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        {formatDisplayDate(q.validUntilDate)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '13.5px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        {formatCurrency(
                          q.totals?.grandTotal || q.financials?.grandTotal || 0,
                          true,
                          q.currency?.code || q.totals?.currencyCode || 'INR'
                        )}
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <Badge variant={STATUS_VARIANTS[q.status] || 'neutral'}>
                          {q.status || 'Draft'}
                        </Badge>
                        {q.status === 'Pending' && q.approvalNote && (
                          <div
                            style={{
                              fontSize: '10.5px',
                              color: '#b45309',
                              backgroundColor: '#fef3c7',
                              padding: '2px 5px',
                              borderRadius: '3px',
                              marginTop: '3px',
                              maxWidth: '120px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={`Admin Remark: ${q.approvalNote}`}
                          >
                            ⚠️ {q.approvalNote}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                          {q.preparedBy || q.salesPerson || q.createdByName || q.createdBy?.name || 'Staff'}
                        </div>
                        {(q.createdByEmail || q.createdBy?.email) && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                            {q.createdByEmail || q.createdBy?.email}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', verticalAlign: 'middle', paddingRight: '16px' }}>
                        <div className="table-actions" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap', gap: '6px' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Eye}
                            title="View & Print Quotation"
                            onClick={() => setPreviewingQuotation(q)}
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Edit2}
                            title="Edit Quotation"
                            onClick={() => handleEdit(q)}
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={GitBranch}
                            isLoading={revisingNo === q.quotationNo}
                            title={revisingNo === q.quotationNo ? 'Branching Revision...' : 'Create Revision (v1 -> v2)'}
                            onClick={() => handleRevision(q)}
                            disabled={Boolean(revisingNo)}
                          />
                          {isAdmin && (q.status === 'Draft' || q.status === 'Pending') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={CheckCircle2}
                              title="Approve & Mark Sent to Client"
                              onClick={() => handleQuickApprove(q)}
                              style={{ color: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                            />
                          )}
                          {isAdmin && (q.status === 'Draft' || q.status === 'Sent' || q.status === 'Pending') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={RotateCcw}
                              title="Return to Staff with Remarks / Corrections"
                              onClick={() => {
                                setReturningQuotation(q);
                                setAdminRemark('');
                              }}
                              style={{ color: '#d97706', borderColor: '#fcd34d' }}
                            />
                          )}
                          {/* Mark Accepted when Customer confirms order (Allowed for both Staff and Admin once quotation is Approved / Sent) */}
                          {(q.status === 'Sent' || q.status === 'Approved') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={CheckCircle2}
                              title="Customer Confirmed Order (Mark Accepted)"
                              onClick={async () => {
                                if (window.confirm(`Did the customer confirm the order for ${q.quotationNo}? This will convert it into Confirmed Order (Accepted).`)) {
                                  try {
                                    await updateQuotationStatus(q.quotationNo, 'Accepted', `Order confirmed by customer (marked by ${user?.name || 'Staff'})`);
                                    success('Order Confirmed!', `Quotation ${q.quotationNo} is now moved to Confirmed Orders (Accepted).`);
                                  } catch (err) {
                                    error('Error', err?.message || 'Could not update status');
                                  }
                                }
                              }}
                              style={{ color: '#16a34a', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}
                            />
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Copy}
                            isLoading={duplicatingNo === q.quotationNo}
                            title={duplicatingNo === q.quotationNo ? 'Duplicating...' : 'Duplicate Quotation'}
                            onClick={() => handleDuplicate(q)}
                            disabled={Boolean(duplicatingNo)}
                          />
                          {/* Direct PDF Download (Locked for Staff if not Approved/Accepted/Sent) */}
                          {(() => {
                            const isApproved = q.status === 'Approved' || q.status === 'Accepted' || q.status === 'Sent';
                            const isLocked = !isAdmin && !isApproved;
                            return (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={isLocked ? Lock : Download}
                                isLoading={downloadingPDFNo === q.quotationNo}
                                title={
                                  isLocked
                                    ? 'PDF Download locked until Admin approves'
                                    : downloadingPDFNo === q.quotationNo
                                    ? 'Downloading PDF...'
                                    : 'Download PDF'
                                }
                                onClick={() => {
                                  if (isLocked) {
                                    error('Approval Required', 'PDF Download is locked until Admin approves this quotation.');
                                    return;
                                  }
                                  handleDirectDownloadPDF(q);
                                }}
                                disabled={Boolean(downloadingPDFNo) || isLocked}
                                style={isLocked ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                              />
                            );
                          })()}
                          {isAdmin && (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={RotateCw}
                              title="Change Status (Admin Only)"
                              onClick={() => handleOpenStatusModal(q)}
                            />
                          )}
                          {isAdmin && (
                            <Button
                              variant="danger"
                              size="sm"
                              icon={Trash2}
                              title="Delete Quotation (Admin Only)"
                              onClick={() => setDeletingQuotation(q)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                borderTop: '1px solid var(--color-border)',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div className="text-caption text-muted">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredQuotations.length)} of{' '}
                {filteredQuotations.length} records (Test Mode)
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
          </>
        )}
      </Card>

      {/* 1. Quotation Preview Modal */}
      {previewingQuotation && (
        <QuotationPreviewModal
          isOpen={Boolean(previewingQuotation)}
          onClose={() => setPreviewingQuotation(null)}
          quotationData={previewingQuotation}
          company={company}
        />
      )}

      {/* 2. Change Status Modal with Activity Logging */}
      {statusModalQuotation && (
        <Modal
          isOpen={Boolean(statusModalQuotation)}
          onClose={() => setStatusModalQuotation(null)}
          title={`Update Status — ${statusModalQuotation.quotationNo}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setStatusModalQuotation(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveStatus}>
                Update Status
              </Button>
            </>
          }
        >
          <form onSubmit={handleSaveStatus} className="flex-col gap-16">
            <div className="flex items-center justify-between" style={{ padding: '8px 12px', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
              <span className="text-caption text-muted">Current Status:</span>
              <Badge variant={STATUS_VARIANTS[statusModalQuotation.status] || 'neutral'}>
                {statusModalQuotation.status || 'Draft'}
              </Badge>
            </div>

            <Select
              label="Select New Status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              options={[
                { value: 'Draft', label: 'Draft (Internal Draft)' },
                { value: 'Pending', label: 'Pending (Under Review / Waiting Approval)' },
                { value: 'Approved', label: 'Approved (Approved by Admin)' },
                { value: 'Sent', label: 'Sent (Dispatched to Client)' },
                { value: 'Accepted', label: 'Accepted (Order Confirmed by Buyer)' },
                { value: 'Rejected', label: 'Rejected (Declined / Cancelled)' },
                { value: 'Expired', label: 'Expired (Past Validity)' },
                { value: 'Cancelled', label: 'Cancelled (Withdrawn)' }
              ]}
              required
            />

            <Input
              label="Audit Activity Note / Reason"
              name="statusNote"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="e.g. Approved via email from buyer procurement manager."
              multiline
              rows={3}
            />
          </form>
        </Modal>
      )}

      {/* 3. Delete Confirmation Modal */}
      {deletingQuotation && (
        <Modal
          isOpen={Boolean(deletingQuotation)}
          onClose={() => setDeletingQuotation(null)}
          title="Confirm Deletion"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeletingQuotation(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteConfirm}>
                Permanently Delete
              </Button>
            </>
          }
        >
          <div className="flex-col gap-12">
            <div className="flex items-center gap-12" style={{ color: 'var(--color-danger)' }}>
              <AlertTriangle size={24} />
              <div className="text-bold">Are you sure you want to delete this quotation?</div>
            </div>

            <p className="text-caption text-muted">
              Quotation <strong>{deletingQuotation.quotationNo}</strong> issued to{' '}
              <strong>{deletingQuotation.customer?.name}</strong> for amount{' '}
              <strong>{formatCurrency(deletingQuotation.totals?.grandTotal || 0)}</strong> will be removed.
            </p>

            {deletingQuotation.status === 'Accepted' && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-warning-light)',
                  border: '1px solid var(--color-warning)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  color: '#8a5800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Caution:</strong> This is an <strong>ACCEPTED</strong> quotation. Deleting it may impact commercial audit logs and order fulfillment records.
                </span>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 4. Revision History / Versioning Timeline Modal */}
      {selectedRevisionHistoryQuotation && (
        <Modal
          isOpen={Boolean(selectedRevisionHistoryQuotation)}
          onClose={() => setSelectedRevisionHistoryQuotation(null)}
          title={`Revision History & Version Trail — ${selectedRevisionHistoryQuotation.quotationNo}`}
          footer={
            <Button variant="primary" onClick={() => setSelectedRevisionHistoryQuotation(null)}>
              Close History
            </Button>
          }
        >
          <div className="flex-col gap-16">
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--color-surface-hover)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
                  Active Version: {selectedRevisionHistoryQuotation.quotationNo}{' '}
                  <Badge variant="success">Current</Badge>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Prepared by {selectedRevisionHistoryQuotation.preparedBy || 'Staff'} •{' '}
                  {formatDisplayDate(selectedRevisionHistoryQuotation.quotationDate)} • Total:{' '}
                  <strong>
                    {formatCurrency(
                      selectedRevisionHistoryQuotation.totals?.grandTotal ||
                        selectedRevisionHistoryQuotation.financials?.grandTotal ||
                        0
                    )}
                  </strong>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                icon={Eye}
                onClick={() => {
                  setPreviewingQuotation(selectedRevisionHistoryQuotation);
                  setSelectedRevisionHistoryQuotation(null);
                }}
              >
                View Active
              </Button>
            </div>

            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
              Historical Revisions &amp; Snapshots:
            </div>

            {(!selectedRevisionHistoryQuotation.revisionHistory ||
              selectedRevisionHistoryQuotation.revisionHistory.length === 0) ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--color-border)'
                }}
              >
                <GitBranch size={24} style={{ color: 'var(--color-text-muted)', margin: '0 auto 8px' }} />
                <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                  This quotation was created as a single revision ({selectedRevisionHistoryQuotation.revisionLabel || 'Initial'}).
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Use the Branch icon in actions table anytime to create a v2/R1 revision snapshot.
                </div>
              </div>
            ) : (
              <div className="flex-col gap-10">
                {selectedRevisionHistoryQuotation.revisionHistory.map((rev, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '3px',
                            backgroundColor: '#e2e8f0',
                            color: '#334155'
                          }}
                        >
                          Rev {rev.version || idx + 1}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{rev.quotationNo}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 3 }}>
                        Snapshot Date: {formatDisplayDate(rev.date || rev.savedAt)} • Total:{' '}
                        <strong>{formatCurrency(rev.totals?.grandTotal || rev.grandTotal || 0)}</strong>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Eye}
                      onClick={() => {
                        setPreviewingQuotation({
                          ...selectedRevisionHistoryQuotation,
                          quotationNo: rev.quotationNo,
                          quotationDate: rev.date || selectedRevisionHistoryQuotation.quotationDate,
                          items: rev.items || selectedRevisionHistoryQuotation.items,
                          totals: rev.totals || selectedRevisionHistoryQuotation.totals,
                          revisionLabel: `Historical Rev ${rev.version || idx + 1}`
                        });
                        setSelectedRevisionHistoryQuotation(null);
                      }}
                    >
                      View Snapshot
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 5. Return for Corrections / Remark Modal */}
      {returningQuotation && (
        <Modal
          isOpen={Boolean(returningQuotation)}
          onClose={() => setReturningQuotation(null)}
          title={`Return for Corrections — ${returningQuotation.quotationNo}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setReturningQuotation(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleReturnForChanges} style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}>
                Send Back to Staff
              </Button>
            </>
          }
        >
          <form onSubmit={handleReturnForChanges} className="flex-col gap-16">
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12.5px',
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <RotateCcw size={18} style={{ flexShrink: 0 }} />
              <span>
                Quotation will be set to <strong>Pending (Review / Changes)</strong> so the staff member can revise rates/items.
              </span>
            </div>

            <Input
              label="Correction Remark / Instructions for Staff"
              name="adminRemark"
              value={adminRemark}
              onChange={(e) => setAdminRemark(e.target.value)}
              placeholder="e.g. Please reduce discount on item #2 by 5%, or update delivery timeline."
              multiline
              rows={4}
              required
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
