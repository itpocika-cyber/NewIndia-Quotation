import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { EmptyState } from '../../components/common/EmptyState';
import { useMasters } from '../../context/MastersContext';
import { useToast } from '../../context/ToastContext';
import { exportToCSV } from '../../utils/exportUtils';
import {
  History,
  Download,
  Search,
  Filter,
  Clock,
  User,
  Activity,
  FileCheck2,
  FileText
} from 'lucide-react';

const ACTION_BADGES = {
  CREATED: { variant: 'success', label: 'Quotation Created' },
  STATUS_CHANGE: { variant: 'info', label: 'Status Changed' },
  UPDATED: { variant: 'warning', label: 'Quotation Updated' },
  DUPLICATED: { variant: 'neutral', label: 'Duplicated' },
  DELETED: { variant: 'danger', label: 'Deleted' },
  CUSTOMER_ADDED: { variant: 'success', label: 'Customer Added' },
  CUSTOMER_UPDATED: { variant: 'neutral', label: 'Customer Updated' },
  CUSTOMER_DELETED: { variant: 'danger', label: 'Customer Deleted' },
  PRODUCT_ADDED: { variant: 'success', label: 'Product Added' },
  PRODUCT_UPDATED: { variant: 'neutral', label: 'Product Updated' },
  PRODUCT_DELETED: { variant: 'danger', label: 'Product Deleted' },
  SETTINGS_UPDATED: { variant: 'info', label: 'Settings Updated' },
  BACKUP_EXPORT: { variant: 'neutral', label: 'Backup Exported' },
  BACKUP_IMPORT: { variant: 'warning', label: 'Backup Restored' }
};

export function ActivityLog() {
  const { activityLogs } = useMasters();
  const { success } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');

  const uniqueUsers = useMemo(() => {
    return Array.from(new Set(activityLogs.map((l) => l.user).filter(Boolean)));
  }, [activityLogs]);

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      // User Filter
      if (userFilter !== 'ALL' && log.user !== userFilter) {
        return false;
      }

      // Action Filter
      if (actionFilter !== 'ALL' && log.action !== actionFilter) {
        return false;
      }

      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchQuote = log.quotationNo?.toLowerCase().includes(term);
        const matchNote = log.note?.toLowerCase().includes(term);
        const matchUser = log.user?.toLowerCase().includes(term);
        if (!matchQuote && !matchNote && !matchUser) return false;
      }

      return true;
    });
  }, [activityLogs, actionFilter, userFilter, searchTerm]);


  const handleExportCSV = () => {
    const columns = [
      { key: 'timestamp', label: 'Timestamp' },
      { key: 'quotationNo', label: 'Entity / Quotation No' },
      { key: 'action', label: 'Action Type' },
      { key: 'user', label: 'Performed By' },
      { key: 'note', label: 'Description & Audit Note' }
    ];

    exportToCSV(`activity_audit_log_${new Date().toISOString().split('T')[0]}`, filteredLogs, columns);
    success('Export Completed', 'Activity log downloaded as CSV.');
  };

  return (
    <div className="flex-col gap-24">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h1 className="heading-main" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <History size={24} style={{ color: 'var(--color-primary)' }} />
            System Audit &amp; Activity Log
          </h1>
          <p className="text-caption text-muted" style={{ marginTop: 4 }}>
            Chronological audit trail of all transactions, lifecycle status changes, and master updates.
          </p>
        </div>

        <div className="header-actions">
          <Button
            variant="secondary"
            icon={Download}
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
          >
            Export Activity Log (CSV)
          </Button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <Card>
        <CardBody style={{ padding: '14px 20px' }}>
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 14 }}>
            <div className="flex items-center gap-12" style={{ flexWrap: 'wrap', flex: 1 }}>
              <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--color-text-muted)' }} />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by quote, user, or note..."
                  style={{ paddingLeft: 32 }}
                />
              </div>

              <div style={{ width: 220 }}>
                <Select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  options={[
                    { value: 'ALL', label: 'All Action Events' },
                    { value: 'CREATED', label: 'Quotation Created' },
                    { value: 'STATUS_CHANGE', label: 'Status Changed' },
                    { value: 'UPDATED', label: 'Quotation Updated' },
                    { value: 'DUPLICATED', label: 'Quotation Duplicated' },
                    { value: 'DELETED', label: 'Quotation Deleted' },
                    { value: 'CUSTOMER_ADDED', label: 'Customer Added' },
                    { value: 'SETTINGS_UPDATED', label: 'Settings Updated' }
                  ]}
                />
              </div>

              <div style={{ width: 200 }}>
                <Select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  options={[
                    { value: 'ALL', label: 'All Users & Staff' },
                    ...uniqueUsers.map((u) => ({ value: u, label: u }))
                  ]}
                />
              </div>
            </div>

            <Badge variant="neutral">{filteredLogs.length} activity records</Badge>
          </div>
        </CardBody>
      </Card>

      {/* Activity Log Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          {filteredLogs.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No Activity Found"
              description="Events and status changes will automatically log here as actions occur."
            />
          ) : (
            <div className="table-responsive-wrapper">
              <Table style={{ minWidth: '850px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>Date & Time</th>
                    <th style={{ width: '140px' }}>Entity / Ref</th>
                    <th style={{ width: '160px' }}>Event Action</th>
                    <th style={{ width: '150px' }}>Performed By</th>
                    <th>Activity Details & Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const badgeConfig = ACTION_BADGES[log.action] || { variant: 'neutral', label: log.action };
                    return (
                      <tr key={log.id}>
                        <td style={{ fontSize: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(log.timestamp).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </td>
                        <td>
                          <span className="text-bold" style={{ color: 'var(--color-primary)' }}>
                            {log.quotationNo || 'System'}
                          </span>
                        </td>
                        <td>
                          <Badge variant={badgeConfig.variant}>{badgeConfig.label}</Badge>
                        </td>
                        <td style={{ fontSize: '13px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <User size={13} style={{ color: 'var(--color-text-muted)' }} />
                            {log.user || 'Jaydip Pipariya'}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px', color: 'var(--color-text)' }}>
                          {log.note || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
