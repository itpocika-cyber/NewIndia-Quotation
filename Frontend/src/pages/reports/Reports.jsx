import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { EmptyState } from '../../components/common/EmptyState';
import { QuotationPreviewModal } from '../quotation/QuotationPreviewModal';
import { ImageLightboxModal } from '../../components/common/ImageLightboxModal';
import { useMasters } from '../../context/MastersContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDisplayDate } from '../../utils/calculations';
import { exportToCSV, exportToJSON } from '../../utils/exportUtils';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  Users,
  Package,
  Tag,
  TrendingUp,
  ArrowUpDown,
  Eye,
  FileDown,
  DatabaseBackup,
  Layers,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';

const STATUS_VARIANTS = {
  Draft: 'neutral',
  Sent: 'info',
  Pending: 'warning',
  Accepted: 'success',
  Rejected: 'danger',
  Expired: 'neutral'
};

export function Reports() {
  const { quotations, customers, products, company, exportFullBackupJSON } = useMasters();
  const { success, info } = useToast();

  const [activeTab, setActiveTab] = useState('quotations'); // 'quotations' | 'customers' | 'products'
  const [dateFilterMode, setDateFilterMode] = useState('month'); // 'today' | 'week' | 'month' | 'year' | 'all' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [previewingQuotation, setPreviewingQuotation] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

  // Sorting states
  const [customerSortKey, setCustomerSortKey] = useState('totalValue');
  const [customerSortDir, setCustomerSortDir] = useState('desc');
  const [productSortKey, setProductSortKey] = useState('totalValue');
  const [productSortDir, setProductSortDir] = useState('desc');

  // 1. Date Range Filter Calculation
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (dateFilterMode === 'today') {
      return { start: todayStr, end: todayStr };
    }

    if (dateFilterMode === 'week') {
      const dayOfWeek = now.getDay() || 7; // Monday = 1
      const startD = new Date(now);
      startD.setDate(now.getDate() - dayOfWeek + 1);
      return { start: startD.toISOString().split('T')[0], end: todayStr };
    }

    if (dateFilterMode === 'month') {
      const startD = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startD.toISOString().split('T')[0], end: todayStr };
    }

    if (dateFilterMode === 'year') {
      const startD = new Date(now.getFullYear(), 0, 1);
      return { start: startD.toISOString().split('T')[0], end: todayStr };
    }

    if (dateFilterMode === 'custom') {
      return { start: customStartDate, end: customEndDate };
    }

    return { start: '', end: '' }; // 'all'
  }, [dateFilterMode, customStartDate, customEndDate]);

  // 2. Filtered Quotations for Quotation Report
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      if (!q.quotationDate) return true;
      if (dateRangeBounds.start && q.quotationDate < dateRangeBounds.start) return false;
      if (dateRangeBounds.end && q.quotationDate > dateRangeBounds.end) return false;
      return true;
    });
  }, [quotations, dateRangeBounds]);

  // Quotation Report KPIs
  const quotationKPIs = useMemo(() => {
    let totalCount = filteredQuotations.length;
    let totalValue = 0;
    let acceptedValue = 0;
    let pendingValue = 0;
    let rejectedValue = 0;
    let draftValue = 0;

    filteredQuotations.forEach((q) => {
      // Use reporting INR value for cross-currency financial aggregation
      const val = q.totals?.reporting?.grandTotalINR || q.totals?.grandTotal || 0;
      totalValue += val;
      if (q.status === 'Accepted') acceptedValue += val;
      if (q.status === 'Pending' || q.status === 'Sent') pendingValue += val;
      if (q.status === 'Rejected') rejectedValue += val;
      if (q.status === 'Draft') draftValue += val;
    });

    return { totalCount, totalValue, acceptedValue, pendingValue, rejectedValue, draftValue };
  }, [filteredQuotations]);

  // 3. Customer Performance Summary
  const customerReportData = useMemo(() => {
    const map = new Map();

    // Initialize map with all known customers
    customers.forEach((c) => {
      map.set(c.name, {
        id: c.id,
        name: c.name,
        contactPerson: c.contactPerson || '-',
        city: c.city || '-',
        state: c.state || '-',
        phone: c.phone || '-',
        totalQuotes: 0,
        acceptedQuotes: 0,
        totalValue: 0,
        acceptedValue: 0,
        pendingValue: 0
      });
    });

    // Populate from quotations
    quotations.forEach((q) => {
      const cName = q.customer?.name;
      if (!cName) return;

      if (!map.has(cName)) {
        map.set(cName, {
          id: q.customer?.id || 'CUS-TEMP',
          name: cName,
          contactPerson: q.customer?.contactPerson || '-',
          city: q.customer?.city || '-',
          state: q.customer?.state || '-',
          phone: q.customer?.phone || '-',
          totalQuotes: 0,
          acceptedQuotes: 0,
          totalValue: 0,
          acceptedValue: 0,
          pendingValue: 0
        });
      }

      const rec = map.get(cName);
      const qVal = q.totals?.reporting?.grandTotalINR || q.totals?.grandTotal || 0;
      rec.totalQuotes++;
      rec.totalValue += qVal;

      if (q.status === 'Accepted') {
        rec.acceptedQuotes++;
        rec.acceptedValue += qVal;
      } else if (q.status === 'Pending' || q.status === 'Sent') {
        rec.pendingValue += qVal;
      }
    });

    const list = Array.from(map.values()).map((c) => ({
      ...c,
      conversionRate: c.totalQuotes > 0 ? Math.round((c.acceptedQuotes / c.totalQuotes) * 100) : 0
    }));

    // Sort
    return list.sort((a, b) => {
      let valA = a[customerSortKey];
      let valB = b[customerSortKey];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return customerSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return customerSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [customers, quotations, customerSortKey, customerSortDir]);

  // 4. Product Sales & Quoted Volumes Summary
  const productReportData = useMemo(() => {
    const map = new Map();

    // Populate from products master
    products.forEach((p) => {
      map.set(p.name, {
        id: p.id,
        name: p.name,
        make: p.make || 'POCIKA',
        category: p.category || 'General',
        unit: p.unit || 'Nos',
        hsnCode: p.hsnCode || '-',
        baseRate: p.rate || 0,
        imageUrl: p.imageUrl || '',
        qtyQuoted: 0,
        timesQuoted: 0,
        totalValue: 0
      });
    });

    // Aggregate from quotations items
    quotations.forEach((q) => {
      if (Array.isArray(q.items)) {
        q.items.forEach((item) => {
          const pName = item.name;
          if (!pName) return;

          if (!map.has(pName)) {
            const cat = products.find((pr) => (pr.id && pr.id === item.productId) || (pr._id && pr._id === item.productId) || pr.name === pName);
            map.set(pName, {
              id: item.productId || cat?.id || 'PRD-CUSTOM',
              name: pName,
              make: item.make || cat?.make || 'POCIKA',
              category: cat?.category || 'General',
              unit: item.unit || cat?.unit || 'Nos',
              hsnCode: item.hsnCode || cat?.hsnCode || '-',
              baseRate: item.rate || cat?.rate || 0,
              imageUrl: item.imageUrl || cat?.imageUrl || '',
              qtyQuoted: 0,
              timesQuoted: 0,
              totalValue: 0
            });
          }

          const rec = map.get(pName);
          if (item.make && !rec.make) rec.make = item.make;
          if (!rec.imageUrl) {
            const cat = products.find((pr) => (pr.id && pr.id === item.productId) || (pr._id && pr._id === item.productId) || pr.name === pName);
            rec.imageUrl = item.imageUrl || cat?.imageUrl || '';
          }
          const qty = parseFloat(item.quantity) || 1;
          const lineTotal = parseFloat(item.totalAmount) || 0;
          rec.qtyQuoted += qty;
          rec.timesQuoted++;
          rec.totalValue += lineTotal;
        });
      }
    });

    const list = Array.from(map.values()).map((p) => ({
      ...p,
      avgQuotedRate: p.qtyQuoted > 0 ? Math.round(p.totalValue / p.qtyQuoted) : p.baseRate
    }));

    // Sort
    return list.sort((a, b) => {
      let valA = a[productSortKey];
      let valB = b[productSortKey];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return productSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return productSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, quotations, productSortKey, productSortDir]);

  // CSV Export Handlers
  const handleExportQuotationsCSV = () => {
    const columns = [
      { key: 'quotationNo', label: 'Quotation No' },
      { key: 'quotationDate', label: 'Date', formatter: (v) => formatDisplayDate(v) },
      { key: 'customer.name', label: 'Customer Name' },
      { key: 'customer.city', label: 'City' },
      { key: 'customer.state', label: 'State' },
      { key: 'customer.phone', label: 'Phone' },
      { key: 'customer.gstin', label: 'Buyer GSTIN' },
      { key: 'salesPerson', label: 'Sales Engineer' },
      { key: 'totals.subtotal', label: 'Gross Subtotal (INR)' },
      { key: 'totals.totalTaxable', label: 'Taxable Value (INR)' },
      { key: 'totals.totalTax', label: 'GST Tax (INR)' },
      { key: 'totals.grandTotal', label: 'Grand Total (INR)' },
      { key: 'status', label: 'Status' }
    ];

    exportToCSV(`quotations_report_${new Date().toISOString().split('T')[0]}`, filteredQuotations, columns);
    success('Export Completed', 'Quotation report downloaded as CSV.');
  };

  const handleExportCustomersCSV = () => {
    const columns = [
      { key: 'id', label: 'Customer ID' },
      { key: 'name', label: 'Customer Name' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'phone', label: 'Phone' },
      { key: 'totalQuotes', label: 'Total Quotes Issued' },
      { key: 'acceptedQuotes', label: 'Accepted Quotes' },
      { key: 'conversionRate', label: 'Conversion Rate (%)', formatter: (v) => `${v}%` },
      { key: 'totalValue', label: 'Total Quoted Value (INR)' },
      { key: 'acceptedValue', label: 'Accepted Value (INR)' },
      { key: 'pendingValue', label: 'Pending Value (INR)' }
    ];

    exportToCSV(`customer_performance_${new Date().toISOString().split('T')[0]}`, customerReportData, columns);
    success('Export Completed', 'Customer performance report downloaded as CSV.');
  };

  const handleExportProductsCSV = () => {
    const columns = [
      { key: 'id', label: 'Product ID' },
      { key: 'name', label: 'Product Description' },
      { key: 'make', label: 'Make / Brand' },
      { key: 'category', label: 'Category' },
      { key: 'hsnCode', label: 'HSN/SAC' },
      { key: 'unit', label: 'Unit' },
      { key: 'qtyQuoted', label: 'Total Quantity Quoted' },
      { key: 'timesQuoted', label: 'Quotation Count' },
      { key: 'avgQuotedRate', label: 'Avg Unit Rate (INR)' },
      { key: 'totalValue', label: 'Total Revenue Quoted (INR)' }
    ];

    exportToCSV(`product_quotation_report_${new Date().toISOString().split('T')[0]}`, productReportData, columns);
    success('Export Completed', 'Product report downloaded as CSV.');
  };

  const handleBackupAllData = () => {
    const filename = exportFullBackupJSON();
    success('System Backup Exported', `Saved complete database backup as ${filename}.`);
  };

  const toggleCustomerSort = (key) => {
    if (customerSortKey === key) {
      setCustomerSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setCustomerSortKey(key);
      setCustomerSortDir('desc');
    }
  };

  const toggleProductSort = (key) => {
    if (productSortKey === key) {
      setProductSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setProductSortKey(key);
      setProductSortDir('desc');
    }
  };

  return (
    <div className="flex-col gap-28" style={{ paddingBottom: '32px' }}>
      {/* Top Header */}
      <div className="page-header" style={{ marginBottom: '4px' }}>
        <div>
          <h1 className="heading-main" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet size={24} style={{ color: 'var(--color-primary)' }} />
            Commercial Analytics & Reports
          </h1>
          <p className="text-caption text-muted" style={{ marginTop: 4 }}>
            Generate filtered transaction breakdowns, customer analytics, and export spreadsheet reports.
          </p>
        </div>

        <div className="header-actions">
          <Button
            variant="secondary"
            icon={DatabaseBackup}
            onClick={handleBackupAllData}
            title="Download full JSON snapshot backup of all tables"
          >
            Backup All Data (JSON)
          </Button>
        </div>
      </div>

      {/* Main Report Navigation Tabs */}
      <div className="tab-nav" style={{ marginBottom: '6px' }}>
        <button
          className={`tab-btn ${activeTab === 'quotations' ? 'active' : ''}`}
          onClick={() => setActiveTab('quotations')}
        >
          <FileSpreadsheet size={15} style={{ marginRight: 6 }} />
          Quotation Report
          <span className="tab-count">{filteredQuotations.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          <Users size={15} style={{ marginRight: 6 }} />
          Customer Report
          <span className="tab-count">{customerReportData.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Package size={15} style={{ marginRight: 6 }} />
          Product Report
          <span className="tab-count">{productReportData.length}</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: QUOTATION REPORT
          ========================================================================= */}
      {activeTab === 'quotations' && (
        <div className="flex-col gap-24" style={{ marginTop: '4px' }}>
          {/* Period Filter Toolbar */}
          <Card style={{ marginBottom: '4px' }}>
            <CardBody style={{ padding: '20px 24px' }}>
              <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
                <div className="flex items-center gap-12" style={{ flexWrap: 'wrap' }}>
                  <span className="text-caption text-bold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={15} /> Period:
                  </span>

                  <div className="flex items-center gap-8" style={{ flexWrap: 'wrap' }}>
                    {[
                      { id: 'month', label: 'This Month' },
                      { id: 'today', label: 'Today' },
                      { id: 'week', label: 'This Week' },
                      { id: 'year', label: 'This Year' },
                      { id: 'all', label: 'All Time' },
                      { id: 'custom', label: 'Custom Range' }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setDateFilterMode(mode.id)}
                        className={`btn btn-sm ${dateFilterMode === mode.id ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ height: '34px', fontSize: '12.5px', padding: '0 14px' }}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  {dateFilterMode === 'custom' && (
                    <div className="flex items-center gap-8" style={{ marginTop: 4 }}>
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        placeholder="Start Date"
                        style={{ width: 140 }}
                      />
                      <span className="text-muted">to</span>
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        placeholder="End Date"
                        style={{ width: 140 }}
                      />
                    </div>
                  )}
                </div>

                <Button
                  variant="primary"
                  icon={Download}
                  onClick={handleExportQuotationsCSV}
                  disabled={filteredQuotations.length === 0}
                >
                  Export Quotations CSV
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Period Summary KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: 22,
              marginTop: '4px',
              marginBottom: '8px'
            }}
          >
            <div className="stat-card" style={{ borderLeft: '4px solid var(--color-primary)', borderRadius: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '22px 24px', minHeight: '135px' }}>
              <div className="flex items-center justify-between">
                <span className="stat-label">Total Quoted Period</span>
                <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(184, 41, 41, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                  <TrendingUp size={16} />
                </div>
              </div>
              <div className="stat-value" style={{ marginTop: 10, fontSize: '24px' }}>{formatCurrency(quotationKPIs.totalValue)}</div>
              <div className="text-caption text-muted" style={{ marginTop: 8, fontWeight: 500 }}>{quotationKPIs.totalCount} Quotations Created</div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid var(--color-success)', borderRadius: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '22px 24px', minHeight: '135px' }}>
              <div className="flex items-center justify-between">
                <span className="stat-label">Accepted Orders</span>
                <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div className="stat-value" style={{ color: 'var(--color-success)', marginTop: 10, fontSize: '24px' }}>
                {formatCurrency(quotationKPIs.acceptedValue)}
              </div>
              <div className="text-caption" style={{ color: 'var(--color-success)', fontWeight: 600, marginTop: 8 }}>
                {quotationKPIs.totalValue > 0 ? Math.round((quotationKPIs.acceptedValue / quotationKPIs.totalValue) * 100) : 0}% Conversion Rate
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid var(--color-warning)', borderRadius: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '22px 24px', minHeight: '135px' }}>
              <div className="flex items-center justify-between">
                <span className="stat-label">Pending / Under Review</span>
                <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(234, 179, 8, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-warning)' }}>
                  <Clock size={16} />
                </div>
              </div>
              <div className="stat-value" style={{ color: 'var(--color-warning)', marginTop: 10, fontSize: '24px' }}>
                {formatCurrency(quotationKPIs.pendingValue)}
              </div>
              <div className="text-caption text-muted" style={{ marginTop: 8 }}>Awaiting client approval</div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid var(--color-danger)', borderRadius: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '22px 24px', minHeight: '135px' }}>
              <div className="flex items-center justify-between">
                <span className="stat-label">Lost / Rejected</span>
                <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)' }}>
                  <XCircle size={16} />
                </div>
              </div>
              <div className="stat-value" style={{ color: 'var(--color-danger)', marginTop: 10, fontSize: '24px' }}>
                {formatCurrency(quotationKPIs.rejectedValue)}
              </div>
              <div className="text-caption text-muted" style={{ marginTop: 8 }}>Declined or expired</div>
            </div>
          </div>

          {/* Quotations Breakdown Table */}
          <Card style={{ marginTop: '4px', marginBottom: '16px' }}>
            <CardHeader style={{ padding: '18px 24px' }}>
              <div className="flex items-center justify-between w-full">
                <h3 className="heading-sub" style={{ fontSize: '15px' }}>
                  Period Quotation Records ({filteredQuotations.length})
                </h3>
              </div>
            </CardHeader>
            <CardBody style={{ padding: 0 }}>
              {filteredQuotations.length === 0 ? (
                <EmptyState
                  icon={FileSpreadsheet}
                  title="No Quotations in Selected Period"
                  description="Try selecting a wider date range or create a new quotation."
                />
              ) : (
                <div className="table-responsive-wrapper">
                  <Table style={{ minWidth: '950px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '130px' }}>Quotation No</th>
                        <th>Customer Name</th>
                        <th style={{ width: '100px' }}>Date</th>
                        <th style={{ width: '130px', textAlign: 'right' }}>Taxable (₹)</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>GST (₹)</th>
                        <th style={{ width: '130px', textAlign: 'right' }}>Grand Total (₹)</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                        <th style={{ width: '80px', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuotations.map((q) => (
                        <tr key={q.quotationNo}>
                          <td>
                            <span className="text-bold" style={{ color: 'var(--color-primary)' }}>
                              {q.quotationNo}
                            </span>
                          </td>
                          <td>
                            <div className="text-bold">{q.customer?.name}</div>
                            <div className="text-caption text-muted">{q.customer?.city}, {q.customer?.state}</div>
                          </td>
                          <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{formatDisplayDate(q.quotationDate)}</td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {formatCurrency(q.totals?.totalTaxable || 0)}
                          </td>
                          <td style={{ textAlign: 'right', color: '#6e6e73', whiteSpace: 'nowrap' }}>
                            {formatCurrency(q.totals?.totalTax || 0)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap' }}>
                            {formatCurrency(q.totals?.grandTotal || 0, true, q.currency?.code || 'INR')}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <Badge variant={STATUS_VARIANTS[q.status] || 'neutral'}>
                              {q.status || 'Draft'}
                            </Badge>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Eye}
                              onClick={() => setPreviewingQuotation(q)}
                              title="Preview Quotation"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 2: CUSTOMER REPORT
          ========================================================================= */}
      {activeTab === 'customers' && (
        <div className="flex-col gap-24" style={{ marginTop: '4px' }}>
          <Card style={{ marginTop: '4px', marginBottom: '16px' }}>
            <CardHeader style={{ padding: '18px 24px' }}>
              <div className="flex items-center justify-between w-full" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 className="heading-sub" style={{ fontSize: '15px' }}>Client Accounts & Quotation Conversion</h3>
                  <p className="text-caption text-muted">Analysis of total quotes issued, conversion rate, and pipeline value by client</p>
                </div>
                <Button
                  variant="primary"
                  icon={Download}
                  onClick={handleExportCustomersCSV}
                  disabled={customerReportData.length === 0}
                >
                  Export Customers CSV
                </Button>
              </div>
            </CardHeader>
            <CardBody style={{ padding: 0 }}>
              {customerReportData.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No Customers Found"
                  description="Add customers in the Customer Master to see performance analytics."
                />
              ) : (
                <div className="table-responsive-wrapper">
                  <Table style={{ minWidth: '950px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '120px' }}>Customer ID</th>
                        <th onClick={() => toggleCustomerSort('name')} style={{ cursor: 'pointer' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            Customer Name <ArrowUpDown size={12} />
                          </span>
                        </th>
                        <th>Location & Contact</th>
                        <th
                          style={{ width: '110px', textAlign: 'right', cursor: 'pointer' }}
                          onClick={() => toggleCustomerSort('totalQuotes')}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            Quotes <ArrowUpDown size={12} />
                          </span>
                        </th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Conversion %</th>
                        <th
                          style={{ width: '150px', textAlign: 'right', cursor: 'pointer' }}
                          onClick={() => toggleCustomerSort('acceptedValue')}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            Accepted (₹) <ArrowUpDown size={12} />
                          </span>
                        </th>
                        <th
                          style={{ width: '160px', textAlign: 'right', cursor: 'pointer' }}
                          onClick={() => toggleCustomerSort('totalValue')}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            Total Value (₹) <ArrowUpDown size={12} />
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerReportData.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <Badge variant="neutral">{c.id}</Badge>
                          </td>
                          <td>
                            <div className="text-bold">{c.name}</div>
                            <div className="text-caption text-muted">Attn: {c.contactPerson}</div>
                          </td>
                          <td>
                            <div>{c.city}, {c.state}</div>
                            <div className="text-caption text-muted">{c.phone}</div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.totalQuotes}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className={`badge ${
                                c.conversionRate >= 50
                                  ? 'badge-success'
                                  : c.conversionRate > 0
                                  ? 'badge-warning'
                                  : 'badge-neutral'
                              }`}
                            >
                              {c.conversionRate}% ({c.acceptedQuotes} won)
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 600 }}>
                            {formatCurrency(c.acceptedValue)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-text)' }}>
                            {formatCurrency(c.totalValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 3: PRODUCT REPORT
          ========================================================================= */}
      {activeTab === 'products' && (
        <div className="flex-col gap-24" style={{ marginTop: '4px' }}>
          <Card style={{ marginTop: '4px', marginBottom: '16px' }}>
            <CardHeader style={{ padding: '18px 24px' }}>
              <div className="flex items-center justify-between w-full" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 className="heading-sub" style={{ fontSize: '15px' }}>Product & Equipment Demand Analysis</h3>
                  <p className="text-caption text-muted">Breakdown of quoted quantities, quotation frequency, and cumulative valuation</p>
                </div>
                <Button
                  variant="primary"
                  icon={Download}
                  onClick={handleExportProductsCSV}
                  disabled={productReportData.length === 0}
                >
                  Export Products CSV
                </Button>
              </div>
            </CardHeader>
            <CardBody style={{ padding: 0 }}>
              {productReportData.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No Products Quoted"
                  description="Products will populate as you create line items in quotations."
                />
              ) : (
                <div className="table-responsive-wrapper">
                  <Table style={{ minWidth: '1150px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '64px', minWidth: '64px', textAlign: 'center' }}>Photo</th>
                        <th style={{ width: '110px', minWidth: '100px' }}>Product ID</th>
                        <th onClick={() => toggleProductSort('name')} style={{ cursor: 'pointer', minWidth: '240px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            Item Description <ArrowUpDown size={12} />
                          </span>
                        </th>
                        <th style={{ width: '130px', minWidth: '110px' }}>Make / Brand</th>
                        <th style={{ width: '160px', minWidth: '140px' }}>Category</th>
                        <th style={{ width: '110px', minWidth: '100px', textAlign: 'center' }}>HSN/SAC</th>
                        <th
                          style={{ width: '110px', textAlign: 'right', cursor: 'pointer' }}
                          onClick={() => toggleProductSort('qtyQuoted')}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            Qty Quoted <ArrowUpDown size={12} />
                          </span>
                        </th>
                        <th
                          style={{ width: '90px', textAlign: 'right', cursor: 'pointer' }}
                          onClick={() => toggleProductSort('timesQuoted')}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            Quotes <ArrowUpDown size={12} />
                          </span>
                        </th>
                        <th style={{ width: '130px', textAlign: 'right' }}>Avg Rate (₹)</th>
                        <th
                          style={{ width: '160px', textAlign: 'right', cursor: 'pointer' }}
                          onClick={() => toggleProductSort('totalValue')}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            Total Value (₹) <ArrowUpDown size={12} />
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {productReportData.map((p) => (
                        <tr key={p.id}>
                          <td style={{ textAlign: 'center', width: '64px' }}>
                            {p.imageUrl ? (
                              <div
                                onClick={() => setViewingImage({ url: p.imageUrl, title: p.name })}
                                title="Click to zoom / view full image"
                                style={{
                                  width: 42,
                                  height: 42,
                                  borderRadius: 6,
                                  backgroundColor: '#ffffff',
                                  border: '1px solid var(--color-border)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                                  e.currentTarget.style.transform = 'scale(1.06)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = 'var(--color-border)';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                              >
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    padding: 2
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                style={{
                                  width: 42,
                                  height: 42,
                                  borderRadius: 6,
                                  backgroundColor: 'var(--color-surface-hover)',
                                  border: '1px dashed var(--color-border)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--color-text-muted)',
                                  margin: '0 auto'
                                }}
                                title="No photo uploaded"
                              >
                                <Package size={18} />
                              </div>
                            )}
                          </td>
                          <td style={{ width: '110px', whiteSpace: 'nowrap' }}>
                            <Badge variant="neutral">{p.id}</Badge>
                          </td>
                          <td style={{ minWidth: '240px' }}>
                            <div className="text-bold" style={{ fontSize: '13px', color: 'var(--color-text)' }}>
                              {p.name}
                            </div>
                          </td>
                          <td style={{ width: '130px', whiteSpace: 'nowrap' }}>
                            <Badge variant="primary">{p.make || 'POCIKA'}</Badge>
                          </td>
                          <td style={{ width: '160px', whiteSpace: 'nowrap' }}>
                            <span
                              className="badge badge-neutral"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '3px 8px',
                                fontSize: '11.5px',
                                lineHeight: 1.2
                              }}
                            >
                              <Tag size={12} style={{ flexShrink: 0, opacity: 0.85 }} />
                              <span>{p.category || 'General'}</span>
                            </span>
                          </td>
                          <td style={{ width: '110px', textAlign: 'center', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>
                            {p.hsnCode ? <code>{p.hsnCode}</code> : '-'}
                          </td>
                          <td style={{ width: '110px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {p.qtyQuoted} <span className="text-caption text-muted">{p.unit}</span>
                          </td>
                          <td style={{ width: '90px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {p.timesQuoted}
                          </td>
                          <td style={{ width: '130px', textAlign: 'right', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                            {formatCurrency(p.avgQuotedRate)}
                          </td>
                          <td style={{ width: '160px', textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                            {formatCurrency(p.totalValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Quotation Preview Modal */}
      {previewingQuotation && (
        <QuotationPreviewModal
          isOpen={Boolean(previewingQuotation)}
          onClose={() => setPreviewingQuotation(null)}
          quotationData={previewingQuotation}
          company={company}
        />
      )}

      {/* Lightbox Zoom Preview Modal */}
      <ImageLightboxModal
        isOpen={Boolean(viewingImage)}
        onClose={() => setViewingImage(null)}
        imageUrl={viewingImage?.url}
        title={viewingImage?.title || 'Product Image Preview'}
      />
    </div>
  );
}
