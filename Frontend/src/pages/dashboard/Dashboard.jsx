import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { QuotationPreviewModal } from '../quotation/QuotationPreviewModal';
import { useMasters } from '../../context/MastersContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDisplayDate } from '../../utils/calculations';
import {
  FileText,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Users,
  Package,
  Calendar,
  Eye,
  ArrowUpRight
} from 'lucide-react';

import {
  Chart as ChartJS,
  registerables
} from 'chart.js';

ChartJS.register(...registerables);

const STATUS_COLORS = {
  Accepted: '#16A34A', // Success green
  Pending: '#D97706',  // Amber warning
  Sent: '#2563EB',     // Blue sent
  Draft: '#64748B',    // Slate draft
  Rejected: '#DC2626', // Red danger
  Expired: '#94A3B8'   // Muted gray
};

const STATUS_VARIANTS = {
  Draft: 'neutral',
  Sent: 'info',
  Pending: 'warning',
  Accepted: 'success',
  Rejected: 'danger',
  Expired: 'neutral'
};

export function Dashboard() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { quotations = [], customers = [], products = [], company = {} } = useMasters();
  const [previewingQuotation, setPreviewingQuotation] = useState(null);
  const [timeRange, setTimeRange] = useState('6M'); // '6M' or '12M'

  const monthlyCanvasRef = useRef(null);
  const statusCanvasRef = useRef(null);
  const monthlyChartInstance = useRef(null);
  const statusChartInstance = useRef(null);

  // 1. Live Calculations across all quotations
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalCount = quotations.length;
    let todayCount = 0;
    let monthCount = 0;

    let totalValue = 0;
    let acceptedValue = 0;
    let pendingValue = 0;
    let draftValue = 0;
    let rejectedValue = 0;

    const statusCounts = {
      Draft: 0,
      Sent: 0,
      Pending: 0,
      Accepted: 0,
      Rejected: 0,
      Expired: 0,
      Cancelled: 0
    };

    quotations.forEach((q) => {
      // In base currency (INR) for accurate consolidated reporting
      const currCode = q.currency?.code || q.totals?.currencyCode || 'INR';
      const rate = q.currency?.exchangeRate || q.totals?.reporting?.exchangeRate || 1;
      const rawAmount = Number(q.totals?.grandTotal || q.financials?.grandTotal || 0);
      const qAmount = q.totals?.reporting?.grandTotalINR || (currCode === 'INR' ? rawAmount : rawAmount * rate);

      totalValue += qAmount;

      const normStatus = q.status || 'Draft';
      if (statusCounts[normStatus] !== undefined) {
        statusCounts[normStatus]++;
      } else if (normStatus === 'Approved') {
        statusCounts['Sent']++;
      }

      if (normStatus === 'Accepted') acceptedValue += qAmount;
      if (normStatus === 'Pending' || normStatus === 'Sent' || normStatus === 'Approved') pendingValue += qAmount;
      if (normStatus === 'Draft') draftValue += qAmount;
      if (normStatus === 'Rejected') rejectedValue += qAmount;

      const rawDate = q.quotationDate || (q.savedAt ? String(q.savedAt).split('T')[0] : '');
      if (rawDate) {
        const dateOnly = String(rawDate).split('T')[0];
        if (dateOnly === todayStr) {
          todayCount++;
        }
        const parts = dateOnly.split('-');
        if (parts.length >= 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          if (m === currentMonth && y === currentYear) {
            monthCount++;
          }
        }
      }
    });

    const conversionRate = totalCount > 0 ? Math.round((statusCounts.Accepted / totalCount) * 100) : 0;

    return {
      totalCount,
      todayCount,
      monthCount,
      totalValue,
      acceptedValue,
      pendingValue,
      draftValue,
      rejectedValue,
      statusCounts,
      conversionRate
    };
  }, [quotations]);

  // 2. Monthly Trend Data (Configurable 6M / 12M)
  const monthlyTrendData = useMemo(() => {
    const months = [];
    const now = new Date();
    const monthCountToLookBack = timeRange === '12M' ? 12 : 6;

    for (let i = monthCountToLookBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      months.push({ key: monthKey, label: monthLabel, count: 0, value: 0 });
    }

    quotations.forEach((q) => {
      const rawDate = q.quotationDate || (q.savedAt ? String(q.savedAt).split('T')[0] : '');
      if (rawDate) {
        const qKey = String(rawDate).substring(0, 7);
        const match = months.find((m) => m.key === qKey);
        if (match) {
          match.count++;
          match.value += Number(q.totals?.grandTotal || q.financials?.grandTotal || 0);
        }
      }
    });

    return months;
  }, [quotations, timeRange]);

  // Period aggregate calculations for Trend card header
  const periodTotals = useMemo(() => {
    const totalVal = monthlyTrendData.reduce((acc, m) => acc + m.value, 0);
    const totalQuotes = monthlyTrendData.reduce((acc, m) => acc + m.count, 0);
    const avgValue = totalQuotes > 0 ? Math.round(totalVal / totalQuotes) : 0;
    return { totalVal, totalQuotes, avgValue };
  }, [monthlyTrendData]);

  // 3. Top 5 Customers by Value
  const topCustomers = useMemo(() => {
    const map = new Map();
    quotations.forEach((q) => {
      const cName = q.customer?.name || 'Unknown Customer';
      const cCity = q.customer?.city || q.customer?.state || 'Gujarat';
      const val = Number(q.totals?.grandTotal || q.financials?.grandTotal || 0);

      if (!map.has(cName)) {
        map.set(cName, { name: cName, city: cCity, count: 0, totalValue: 0 });
      }
      const existing = map.get(cName);
      existing.count++;
      existing.totalValue += val;
    });

    return Array.from(map.values())
      .filter((c) => c.name !== 'Unknown Customer' || c.totalValue > 0)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);
  }, [quotations]);

  // 5. Top 5 Products by Quantity
  const topProducts = useMemo(() => {
    const map = new Map();
    quotations.forEach((q) => {
      if (Array.isArray(q.items)) {
        q.items.forEach((item) => {
          const pName = item.name || 'Unnamed Product';
          const qty = parseFloat(item.quantity) || 1;
          const val = parseFloat(item.totalAmount) || (qty * (parseFloat(item.rate) || 0)) || 0;

          if (!map.has(pName)) {
            map.set(pName, { name: pName, quantity: 0, count: 0, totalValue: 0 });
          }
          const existing = map.get(pName);
          existing.quantity += qty;
          existing.count++;
          existing.totalValue += val;
        });
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [quotations]);

  // 6. Recent Quotations (Last 6)
  const recentQuotations = useMemo(() => {
    return [...quotations]
      .sort((a, b) => new Date(b.quotationDate || b.savedAt) - new Date(a.quotationDate || a.savedAt))
      .slice(0, 6);
  }, [quotations]);

  // Render Chart.js instances
  useEffect(() => {
    try {
      // 1. Monthly Trend Chart
      if (monthlyCanvasRef.current) {
        const existingMonthly = ChartJS.getChart(monthlyCanvasRef.current);
        if (existingMonthly) {
          existingMonthly.destroy();
        }
        if (monthlyChartInstance.current) {
          monthlyChartInstance.current.destroy();
          monthlyChartInstance.current = null;
        }

        const ctx = monthlyCanvasRef.current.getContext('2d');
        const labels = monthlyTrendData.map((m) => m.label);
        const valuesInK = monthlyTrendData.map((m) => Number((m.value / 1000).toFixed(2)));
        const counts = monthlyTrendData.map((m) => m.count);

        // Bar Gradient
        const barGradient = ctx.createLinearGradient(0, 0, 0, 240);
        barGradient.addColorStop(0, '#B3261E');
        barGradient.addColorStop(1, '#E11D48');

        // Line Background Gradient
        const lineGradient = ctx.createLinearGradient(0, 0, 0, 240);
        lineGradient.addColorStop(0, 'rgba(15, 23, 42, 0.08)');
        lineGradient.addColorStop(1, 'rgba(15, 23, 42, 0.00)');

        monthlyChartInstance.current = new ChartJS(monthlyCanvasRef.current, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                type: 'bar',
                label: 'Valuation (₹ Thousands)',
                data: valuesInK,
                backgroundColor: barGradient,
                hoverBackgroundColor: '#991B1B',
                borderRadius: { topLeft: 6, topRight: 6 },
                borderSkipped: false,
                barThickness: timeRange === '12M' ? 14 : 24,
                yAxisID: 'y'
              },
              {
                type: 'line',
                label: 'Quotations Volume',
                data: counts,
                borderColor: '#0F172A',
                backgroundColor: lineGradient,
                fill: true,
                borderWidth: 2.2,
                pointRadius: 4,
                pointBackgroundColor: '#0F172A',
                pointBorderColor: '#FFFFFF',
                pointBorderWidth: 1.5,
                pointHoverRadius: 6,
                tension: 0.25,
                yAxisID: 'y1'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              mode: 'index',
              intersect: false
            },
            plugins: {
              legend: {
                position: 'top',
                align: 'end',
                labels: {
                  boxWidth: 10,
                  boxHeight: 10,
                  usePointStyle: true,
                  font: { size: 11.5, weight: '600', family: 'Inter, system-ui, sans-serif' },
                  color: '#475569',
                  padding: 12
                }
              },
              tooltip: {
                backgroundColor: '#0F172A',
                titleFont: { size: 12, weight: '700' },
                bodyFont: { size: 12 },
                padding: 12,
                cornerRadius: 8,
                boxPadding: 4,
                callbacks: {
                  label: (context) => {
                    if (context.datasetIndex === 0) {
                      const actualVal = monthlyTrendData[context.dataIndex]?.value || 0;
                      return ` Total Value: ₹ ${actualVal.toLocaleString('en-IN')}`;
                    }
                    return ` Quotation Count: ${context.parsed.y} Quotes`;
                  }
                }
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: '#64748B', font: { size: 11, weight: '500' } }
              },
              y: {
                type: 'linear',
                position: 'left',
                grid: { color: '#F1F5F9' },
                ticks: {
                  color: '#64748B',
                  font: { size: 11 },
                  callback: (val) => {
                    if (val === 0) return '₹0';
                    if (val >= 100) return `₹${(val / 100).toFixed(1)}L`;
                    return `₹${val}k`;
                  }
                }
              },
              y1: {
                type: 'linear',
                position: 'right',
                grid: { display: false },
                ticks: {
                  color: '#64748B',
                  font: { size: 11 },
                  stepSize: 1
                }
              }
            }
          }
        });
      }

      // 2. Status Distribution Doughnut Chart
      if (statusCanvasRef.current) {
        const existingStatus = ChartJS.getChart(statusCanvasRef.current);
        if (existingStatus) {
          existingStatus.destroy();
        }
        if (statusChartInstance.current) {
          statusChartInstance.current.destroy();
          statusChartInstance.current = null;
        }

        const activeStatuses = ['Accepted', 'Pending', 'Sent', 'Draft', 'Rejected'];
        const statusCounts = activeStatuses.map((st) => stats.statusCounts[st] || 0);
        const bgColors = activeStatuses.map((st) => STATUS_COLORS[st]);
        const totalCount = statusCounts.reduce((a, b) => a + b, 0);

        statusChartInstance.current = new ChartJS(statusCanvasRef.current, {
          type: 'doughnut',
          data: {
            labels: activeStatuses,
            datasets: [
              {
                data: totalCount > 0 ? statusCounts : [1],
                backgroundColor: totalCount > 0 ? bgColors : ['#E2E8F0'],
                borderWidth: 2,
                borderColor: '#FFFFFF',
                hoverOffset: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
              legend: {
                display: true,
                position: 'bottom',
                labels: {
                  boxWidth: 8,
                  boxHeight: 8,
                  usePointStyle: true,
                  padding: 10,
                  font: { size: 11, family: 'Inter, system-ui, sans-serif', weight: '500' },
                  color: '#475569',
                  generateLabels: (chart) => {
                    const data = chart.data;
                    if (data.labels.length && data.datasets.length) {
                      return data.labels.map((label, i) => {
                        const val = statusCounts[i];
                        const pct = totalCount > 0 ? Math.round((val / totalCount) * 100) : 0;
                        return {
                          text: `${label} (${val} • ${pct}%)`,
                          fillStyle: bgColors[i],
                          strokeStyle: bgColors[i],
                          lineWidth: 0,
                          pointStyle: 'circle',
                          hidden: false,
                          index: i
                        };
                      });
                    }
                    return [];
                  }
                }
              },
              tooltip: {
                enabled: totalCount > 0,
                backgroundColor: '#0F172A',
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                  label: (ctx) => {
                    const count = ctx.parsed;
                    const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                    return ` ${ctx.label}: ${count} quotes (${pct}%)`;
                  }
                }
              }
            }
          }
        });
      }
    } catch (err) {
      console.error('Chart.js initialization error:', err);
    }

    return () => {
      try {
        if (monthlyCanvasRef.current) {
          ChartJS.getChart(monthlyCanvasRef.current)?.destroy();
        }
        if (statusCanvasRef.current) {
          ChartJS.getChart(statusCanvasRef.current)?.destroy();
        }
        if (monthlyChartInstance.current) {
          monthlyChartInstance.current.destroy();
          monthlyChartInstance.current = null;
        }
        if (statusChartInstance.current) {
          statusChartInstance.current.destroy();
          statusChartInstance.current = null;
        }
      } catch (err) {
        // silent cleanup
      }
    };
  }, [monthlyTrendData, stats, timeRange]);

  return (
    <div className="flex-col" style={{ gap: 28, paddingBottom: '32px' }}>
      {/* Top Banner / Welcome Header */}
      <div className="page-header" style={{ marginBottom: '4px' }}>
        <div>
          <h1 className="heading-main" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={24} style={{ color: 'var(--color-primary)' }} />
            {isAdmin ? 'Commercial Executive Dashboard' : `Staff Dashboard — ${user?.name || 'Sales Staff'}`}
          </h1>
          <p className="text-caption text-muted" style={{ marginTop: 4 }}>
            {isAdmin
              ? `Live performance, company-wide pipeline valuation, and quotation metrics for ${company?.name || 'POCIKA Fire & Safety LLP'}.`
              : `Your personal quotation performance and customer pipeline overview for ${company?.name || 'POCIKA'}.`}
          </p>
        </div>

        <div className="header-actions">
          {isAdmin && (
            <Button
              variant="secondary"
              icon={FileSpreadsheet}
              onClick={() => navigate('/reports')}
            >
              Detailed Reports
            </Button>
          )}
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => navigate('/quotations/create')}
          >
            Create Quotation
          </Button>
        </div>
      </div>

      {/* 1. Key Performance Indicator (KPI) Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 22,
          marginTop: '4px',
          marginBottom: '8px'
        }}
      >
        {/* Total Value Card */}
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-primary)', borderRadius: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '22px 24px', minHeight: '135px' }}>
          <div className="flex items-center justify-between">
            <span className="stat-label">Total Quotation Pipeline</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(184, 41, 41, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ marginTop: 10, fontSize: '24px' }}>{formatCurrency(stats.totalValue)}</div>
          <div className="text-caption text-muted" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{stats.totalCount} total quotations issued</span>
          </div>
        </div>

        {/* Accepted Value Card */}
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-success)', borderRadius: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '22px 24px', minHeight: '135px' }}>
          <div className="flex items-center justify-between">
            <span className="stat-label">Confirmed Orders (Accepted)</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-success)', marginTop: 10, fontSize: '24px' }}>
            {formatCurrency(stats.acceptedValue)}
          </div>
          <div className="text-caption text-muted" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="badge badge-success" style={{ padding: '2px 6px', fontSize: '11px' }}>
              {stats.conversionRate}% Conversion
            </span>
            <span>{stats.statusCounts.Accepted} won quotes</span>
          </div>
        </div>

        {/* Pending Pipeline Card */}
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-warning)', borderRadius: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '22px 24px', minHeight: '135px' }}>
          <div className="flex items-center justify-between">
            <span className="stat-label">Under Review / Pending</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(234, 179, 8, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-warning)' }}>
              <Clock size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-warning)', marginTop: 10, fontSize: '24px' }}>
            {formatCurrency(stats.pendingValue)}
          </div>
          <div className="text-caption text-muted" style={{ marginTop: 8 }}>
            <span>{stats.statusCounts.Pending + stats.statusCounts.Sent} quotes awaiting decision</span>
          </div>
        </div>

        {/* Monthly Activity Card */}
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-info)', borderRadius: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '22px 24px', minHeight: '135px' }}>
          <div className="flex items-center justify-between">
            <span className="stat-label">Current Month Activity</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(26, 115, 232, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-info)' }}>
              <Calendar size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-info)', marginTop: 10, fontSize: '24px' }}>
            {stats.monthCount} Quotes
          </div>
          <div className="text-caption text-muted" style={{ marginTop: 8 }}>
            <span>{stats.todayCount} created today</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Status Navigation Bar */}
      <Card>
        <CardBody style={{ padding: '14px 20px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 12,
              alignItems: 'center'
            }}
          >
            <div
              style={{
                cursor: 'pointer',
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: 'var(--color-surface-hover)',
                border: '1px solid var(--color-border)',
                transition: 'all var(--transition-fast)'
              }}
              onClick={() => navigate('/quotations?status=ALL')}
            >
              <div className="text-caption text-muted" style={{ fontWeight: 600 }}>All Quotes</div>
              <div className="text-bold" style={{ fontSize: '19px', marginTop: 2 }}>{stats.totalCount}</div>
            </div>

            <div
              style={{
                cursor: 'pointer',
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: 'rgba(30, 142, 62, 0.06)',
                border: '1px solid rgba(30, 142, 62, 0.2)',
                transition: 'all var(--transition-fast)'
              }}
              onClick={() => navigate('/quotations?status=Accepted')}
            >
              <div className="text-caption" style={{ color: 'var(--color-success)', fontWeight: 600 }}>Accepted</div>
              <div className="text-bold" style={{ fontSize: '19px', marginTop: 2, color: 'var(--color-success)' }}>
                {stats.statusCounts.Accepted}
              </div>
            </div>

            <div
              style={{
                cursor: 'pointer',
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: 'rgba(185, 137, 0, 0.06)',
                border: '1px solid rgba(185, 137, 0, 0.2)',
                transition: 'all var(--transition-fast)'
              }}
              onClick={() => navigate('/quotations?status=Pending')}
            >
              <div className="text-caption" style={{ color: 'var(--color-warning)', fontWeight: 600 }}>Pending</div>
              <div className="text-bold" style={{ fontSize: '19px', marginTop: 2, color: 'var(--color-warning)' }}>
                {stats.statusCounts.Pending}
              </div>
            </div>

            <div
              style={{
                cursor: 'pointer',
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: 'rgba(26, 115, 232, 0.06)',
                border: '1px solid rgba(26, 115, 232, 0.2)',
                transition: 'all var(--transition-fast)'
              }}
              onClick={() => navigate('/quotations?status=Sent')}
            >
              <div className="text-caption" style={{ color: 'var(--color-info)', fontWeight: 600 }}>Sent</div>
              <div className="text-bold" style={{ fontSize: '19px', marginTop: 2, color: 'var(--color-info)' }}>
                {stats.statusCounts.Sent}
              </div>
            </div>

            <div
              style={{
                cursor: 'pointer',
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: 'rgba(110, 110, 115, 0.06)',
                border: '1px solid rgba(110, 110, 115, 0.2)',
                transition: 'all var(--transition-fast)'
              }}
              onClick={() => navigate('/quotations?status=Draft')}
            >
              <div className="text-caption" style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Drafts</div>
              <div className="text-bold" style={{ fontSize: '19px', marginTop: 2 }}>{stats.statusCounts.Draft}</div>
            </div>

            <div
              style={{
                cursor: 'pointer',
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: 'rgba(197, 34, 31, 0.06)',
                border: '1px solid rgba(197, 34, 31, 0.2)',
                transition: 'all var(--transition-fast)'
              }}
              onClick={() => navigate('/quotations?status=Rejected')}
            >
              <div className="text-caption" style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Rejected</div>
              <div className="text-bold" style={{ fontSize: '19px', marginTop: 2, color: 'var(--color-danger)' }}>
                {stats.statusCounts.Rejected}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 3. Middle Analytical Split: Monthly Valuation & Status Breakdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: 20
        }}
      >
        {/* Left: Monthly Trend Bar/Line Chart */}
        <Card style={{ height: '390px', display: 'flex', flexDirection: 'column' }}>
          <CardHeader>
            <div className="flex items-center justify-between w-full" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 className="heading-sub">Monthly Quotation Valuation</h3>
                <p className="text-caption text-muted">Monthly value trend (₹ in thousands) vs quotation volume</p>
              </div>

              {/* Time Range Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setTimeRange('6M')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: timeRange === '6M' ? '#FFFFFF' : 'transparent',
                    color: timeRange === '6M' ? '#0F172A' : '#64748B',
                    boxShadow: timeRange === '6M' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  6M
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange('12M')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: timeRange === '12M' ? '#FFFFFF' : 'transparent',
                    color: timeRange === '12M' ? '#0F172A' : '#64748B',
                    boxShadow: timeRange === '12M' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  12M
                </button>
              </div>
            </div>
          </CardHeader>

          {/* KPI Sub-header Bar */}
          <div
            style={{
              padding: '6px 16px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
              color: '#64748B'
            }}
          >
            <div>
              <span>Period Pipeline: </span>
              <strong style={{ color: '#0F172A' }}>{formatCurrency(periodTotals.totalVal)}</strong>
            </div>
            <div style={{ width: '1px', height: '12px', backgroundColor: '#CBD5E1' }} />
            <div>
              <span>Volume: </span>
              <strong style={{ color: '#0F172A' }}>{periodTotals.totalQuotes} Quotes</strong>
            </div>
            <div style={{ width: '1px', height: '12px', backgroundColor: '#CBD5E1' }} />
            <div>
              <span>Avg Deal: </span>
              <strong style={{ color: '#0F172A' }}>{formatCurrency(periodTotals.avgValue)}</strong>
            </div>
          </div>

          <CardBody style={{ flex: 1, position: 'relative', padding: '12px 16px', minHeight: 0 }}>
            <canvas ref={monthlyCanvasRef} />
          </CardBody>
        </Card>

        {/* Right: Status Breakdown Card */}
        <Card style={{ height: '390px', display: 'flex', flexDirection: 'column' }}>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <h3 className="heading-sub">Status Breakdown</h3>
                <p className="text-caption text-muted">Conversion funnel distribution across all quotations</p>
              </div>
              <Badge variant="neutral">{stats.totalCount} Quotes</Badge>
            </div>
          </CardHeader>

          <CardBody style={{ flex: 1, position: 'relative', padding: '12px 16px', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <canvas ref={statusCanvasRef} />

            {/* Centered KPI Hole Content */}
            <div
              style={{
                position: 'absolute',
                top: '40%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                lineHeight: 1.15
              }}
            >
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
                {stats.totalCount}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>
                Total Quotes
              </div>
              {stats.totalCount > 0 && (
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#16A34A', marginTop: 2 }}>
                  {stats.conversionRate}% Won
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 4. Bottom Split Layout: Recent Quotations (Main) + Top Rankings (Side) */}
      <div className="dashboard-bottom-grid">
        {/* Recent Quotations Table */}
        <Card style={{ minHeight: 400 }}>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <h3 className="heading-sub">Recent Quotations</h3>
                <p className="text-caption text-muted">Latest commercial estimates issued to clients</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/quotations')}
                icon={ArrowUpRight}
              >
                View Register
              </Button>
            </div>
          </CardHeader>
          <CardBody style={{ padding: 0 }}>
            {recentQuotations.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No Quotations Created Yet"
                description="Start issuing professional GST compliant fire safety proposals."
                actionLabel="Create Quotation"
                onAction={() => navigate('/quotations/create')}
              />
            ) : (
              <Table
                className="table-compact"
                style={{ width: '100%', minWidth: '100%', tableLayout: 'auto' }}
                containerStyle={{ border: 'none', borderRadius: 0 }}
              >
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>Quotation No</th>
                    <th>Customer (Buyer)</th>
                    <th style={{ width: '85px' }}>Date</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Amount</th>
                    <th style={{ width: '85px', textAlign: 'center' }}>Status</th>
                    <th style={{ width: '45px', textAlign: 'right' }}>View</th>
                  </tr>
                </thead>
                <tbody>
                  {recentQuotations.map((q) => (
                    <tr key={q.quotationNo}>
                      <td>
                        <span className="text-bold" style={{ color: 'var(--color-primary)' }}>
                          {q.quotationNo}
                        </span>
                      </td>
                      <td>
                        <div className="text-bold" style={{ fontSize: '13px' }}>{q.customer?.name}</div>
                        <div className="text-caption text-muted">{[q.customer?.city, q.customer?.state].filter(Boolean).join(', ')}</div>
                      </td>
                      <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{formatDisplayDate(q.quotationDate)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        {formatCurrency(q.totals?.grandTotal || q.financials?.grandTotal || 0, true, q.currency?.code || 'INR')}
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
            )}
          </CardBody>
        </Card>

        {/* Right Stack: Top Customers & Top Products */}
        <div className="flex-col gap-20">
          {/* Top Customers List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div>
                  <h3 className="heading-sub">Top 5 Key Clients</h3>
                  <p className="text-caption text-muted">Ranked by cumulative quotation value</p>
                </div>
                <Users size={16} className="text-muted" />
              </div>
            </CardHeader>
            <CardBody style={{ padding: 0 }}>
              {topCustomers.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No customer transactions recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {topCustomers.map((cust, i) => (
                    <div
                      key={cust.name}
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: i < topCustomers.length - 1 ? '1px solid var(--color-border)' : 'none',
                        transition: 'background-color var(--transition-fast)'
                      }}
                    >
                      <div>
                        <div className="text-bold" style={{ fontSize: '13.5px' }}>{cust.name}</div>
                        <div className="text-caption text-muted">{cust.count} quotes issued • {cust.city}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="text-bold" style={{ color: 'var(--color-primary)', fontSize: '13px' }}>
                          {formatCurrency(cust.totalValue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Top Products / Systems List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div>
                  <h3 className="heading-sub">Top 5 Quoted Equipment</h3>
                  <p className="text-caption text-muted">Ranked by units quoted</p>
                </div>
                <Package size={16} className="text-muted" />
              </div>
            </CardHeader>
            <CardBody style={{ padding: 0 }}>
              {topProducts.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No product line items quoted yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {topProducts.map((prod, i) => (
                    <div
                      key={prod.name}
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: i < topProducts.length - 1 ? '1px solid var(--color-border)' : 'none',
                        transition: 'background-color var(--transition-fast)'
                      }}
                    >
                      <div style={{ maxWidth: '65%' }}>
                        <div className="text-bold truncate" style={{ fontSize: '13px' }} title={prod.name}>
                          {prod.name}
                        </div>
                        <div className="text-caption text-muted">{prod.count} quotes</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="text-bold" style={{ fontSize: '13px' }}>
                          {prod.quantity} Units
                        </div>
                        <div className="text-caption text-muted">{formatCurrency(prod.totalValue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Quotation Preview Modal */}
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
