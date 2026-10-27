import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useMasters } from '../../context/MastersContext';
import { api } from '../../services/api';
import { formatCurrency, formatDisplayDate } from '../../utils/calculations';
import { QuotationPreviewModal } from '../quotation/QuotationPreviewModal';
import {
  Users,
  UserCheck,
  ShieldCheck,
  UserPlus,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  RotateCcw,
  CheckCircle2,
  Lock,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  MessageSquare,
  Activity,
  Layers,
  XCircle
} from 'lucide-react';

const STATUS_VARIANTS = {
  Draft: 'neutral',
  Pending: 'warning',
  Sent: 'primary',
  Approved: 'success',
  Accepted: 'success',
  Rejected: 'danger',
  Expired: 'neutral',
  Cancelled: 'neutral'
};

export function AuthorizedUsers() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const { company, updateQuotationStatus } = useMasters();
  const { success, error, info } = useToast();

  // State
  const [usersList, setUsersList] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'STAFF' | 'ADMIN'

  // Selected User for Dedicated Drilldown Page View
  const [selectedUser, setSelectedUser] = useState(null);
  const [userWorkData, setUserWorkData] = useState(null);
  const [isLoadingUserWork, setIsLoadingUserWork] = useState(false);
  const [userWorkTab, setUserWorkTab] = useState('quotations'); // 'quotations' | 'activity'
  const [quoteSearchTerm, setQuoteSearchTerm] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('ALL');

  // Preview & Remarks Modal
  const [previewingQuotation, setPreviewingQuotation] = useState(null);
  const [remarkModalQuotation, setRemarkModalQuotation] = useState(null);
  const [adminRemarkText, setAdminRemarkText] = useState('');
  const [targetStatusForRemark, setTargetStatusForRemark] = useState('Pending');
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userModalError, setUserModalError] = useState('');
  const [newUserData, setNewUserData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'staff'
  });

  // Fetch all users with aggregated work statistics
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setIsUsersLoading(true);
      const data = await api.users.getAll();
      setUsersList(data || []);
    } catch (err) {
      error('Failed to load users', err.message || 'Error fetching user directory.');
    } finally {
      setIsUsersLoading(false);
    }
  }, [isAdmin, error]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Fetch full work dossier (quotations + audit logs) when a user is selected
  const loadUserWorkDossier = useCallback(
    async (targetUser) => {
      setSelectedUser(targetUser);
      setIsLoadingUserWork(true);
      setUserWorkTab('quotations');
      setQuoteSearchTerm('');
      setQuoteStatusFilter('ALL');

      try {
        const userId = targetUser.id || targetUser._id;
        const workData = await api.users.getUserWork(userId);
        setUserWorkData(workData);
      } catch (err) {
        error('Failed to fetch user dossier', err.message || 'Could not load quotation records.');
      } finally {
        setIsLoadingUserWork(false);
      }
    },
    [error]
  );

  // Quick refresh for current selected user's quotations
  const refreshCurrentDossier = async () => {
    if (!selectedUser) return;
    await loadUserWorkDossier(selectedUser);
    await fetchUsers();
  };

  // Create User Handler
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserModalError('');

    if (!newUserData.email || !newUserData.email.trim()) {
      setUserModalError('Email address is required.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(newUserData.email.trim())) {
      setUserModalError('Please enter a valid email address.');
      return;
    }
    if (!newUserData.password || newUserData.password.length < 6) {
      setUserModalError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmittingUser(true);
      await api.users.create(newUserData);
      success('User Created', `User ${newUserData.email} created successfully.`);
      setNewUserData({ email: '', name: '', password: '', role: 'staff' });
      setIsAddUserModalOpen(false);
      await fetchUsers();
    } catch (err) {
      const msg = err.data?.error || err.message || 'Could not create new user.';
      setUserModalError(msg);
      error('Creation Failed', msg);
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Toggle Role Handler
  const handleToggleUserRole = async (targetUser) => {
    if (targetUser.isSuperAdmin) {
      error('Action Prohibited', 'The master super-admin account cannot be modified.');
      return;
    }
    const newRole = targetUser.role === 'admin' ? 'staff' : 'admin';
    const confirmed = window.confirm(
      `Change access role for "${targetUser.email}" to ${newRole.toUpperCase()}?`
    );
    if (!confirmed) return;

    try {
      await api.users.update(targetUser.id || targetUser._id, { role: newRole });
      success('Role Updated', `${targetUser.email} is now ${newRole.toUpperCase()}.`);
      await fetchUsers();
      if (selectedUser && (selectedUser.id || selectedUser._id) === (targetUser.id || targetUser._id)) {
        setSelectedUser((prev) => ({ ...prev, role: newRole }));
      }
    } catch (err) {
      error('Update Failed', err.message || 'Could not update role.');
    }
  };

  // Delete User Handler
  const handleDeleteUser = async (targetUser) => {
    if (targetUser.isSuperAdmin) {
      error('Action Prohibited', 'Super Admin accounts cannot be deleted.');
      return;
    }
    if (currentUser?.userId === (targetUser.id || targetUser._id)) {
      error('Action Prohibited', 'You cannot delete your own active session account.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete user "${targetUser.name || targetUser.email}"?\n\nThis will remove their system credentials.`
    );
    if (!confirmed) return;

    try {
      await api.users.delete(targetUser.id || targetUser._id);
      success('User Removed', `Account ${targetUser.email} has been deleted.`);
      if (selectedUser && (selectedUser.id || selectedUser._id) === (targetUser.id || targetUser._id)) {
        setSelectedUser(null);
      }
      await fetchUsers();
    } catch (err) {
      error('Deletion Failed', err.message || 'Could not delete user account.');
    }
  };

  // Open Remark / Review Modal for a specific Quotation
  const handleOpenRemarkModal = (q, defaultStatus = 'Pending') => {
    setRemarkModalQuotation(q);
    setTargetStatusForRemark(defaultStatus);
    setAdminRemarkText(
      defaultStatus === 'Pending'
        ? 'Please check pricing and update delivery timeline.'
        : ''
    );
  };

  // Submit Remark & Status Change directly to the quotation
  const handleSubmitRemark = async (e) => {
    e.preventDefault();
    if (!remarkModalQuotation) return;

    try {
      setIsSubmittingRemark(true);
      const qNo = remarkModalQuotation.quotationNo || remarkModalQuotation.quotationNumber;
      await updateQuotationStatus(
        qNo,
        targetStatusForRemark,
        adminRemarkText || `Admin review updated to ${targetStatusForRemark}`
      );

      success(
        'Quotation Updated with Remark',
        `${qNo} has been set to ${targetStatusForRemark}. Staff can see your correction note.`
      );

      setRemarkModalQuotation(null);
      setAdminRemarkText('');
      // Refresh current dossier view
      if (selectedUser) {
        await refreshCurrentDossier();
      }
    } catch (err) {
      error('Update Failed', err.message || 'Could not submit remark.');
    } finally {
      setIsSubmittingRemark(false);
    }
  };

  // Direct Approve or Reject action from Staff Dossier
  const handleDirectAction = async (q, targetStatus) => {
    try {
      const qNo = q.quotationNo || q.quotationNumber;
      await updateQuotationStatus(
        qNo,
        targetStatus,
        `Quotation ${targetStatus === 'Approved' ? 'Approved' : 'Rejected'} by Admin`
      );
      success(
        targetStatus === 'Approved' ? 'Quotation Approved' : 'Quotation Rejected',
        `Quotation ${qNo} is now marked as ${targetStatus}.`
      );
      if (selectedUser) {
        await refreshCurrentDossier();
      }
    } catch (err) {
      error('Action Failed', err.message || 'Could not update quotation.');
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      if (roleFilter === 'ADMIN' && u.role !== 'admin') return false;
      if (roleFilter === 'STAFF' && u.role === 'admin') return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = u.name?.toLowerCase().includes(term);
        const matchEmail = u.email?.toLowerCase().includes(term);
        return matchName || matchEmail;
      }
      return true;
    });
  }, [usersList, roleFilter, searchTerm]);

  // Aggregate Metrics for Top Banner
  const totalUsersCount = usersList.length;
  const staffMembersCount = usersList.filter((u) => u.role !== 'admin').length;
  const adminMembersCount = usersList.filter((u) => u.role === 'admin').length;
  const firmTotalQuotations = usersList.reduce((acc, u) => acc + (u.quotationsCount || 0), 0);
  const firmTotalGrossValue = usersList.reduce((acc, u) => acc + (u.totalValue || 0), 0);

  // Filtered Quotations inside the selected user view
  const userQuotationsList = useMemo(() => {
    if (!userWorkData?.quotations) return [];
    return userWorkData.quotations.filter((q) => {
      if (quoteStatusFilter !== 'ALL' && q.status !== quoteStatusFilter) return false;
      if (quoteSearchTerm.trim()) {
        const term = quoteSearchTerm.toLowerCase();
        const qNo = (q.quotationNo || q.quotationNumber || '').toLowerCase();
        const cust = (q.customerName || q.customer?.name || '').toLowerCase();
        return qNo.includes(term) || cust.includes(term);
      }
      return true;
    });
  }, [userWorkData, quoteStatusFilter, quoteSearchTerm]);

  if (!isAdmin) {
    return (
      <div className="page-container" style={{ padding: '32px' }}>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Lock size={40} style={{ color: 'var(--color-danger)', margin: '0 auto 12px' }} />
              <h3 className="heading-sub">Administrator Access Required</h3>
              <p className="text-caption text-muted" style={{ marginTop: 4 }}>
                The Authorized Users module is restricted to system administrators.
              </p>
              <Button variant="secondary" onClick={() => navigate('/dashboard')} style={{ marginTop: 16 }}>
                Return to Dashboard
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container flex-col gap-20" style={{ paddingBottom: '40px' }}>
      {/* =========================================================================
          VIEW A: DEDICATED INDIVIDUAL USER / STAFF QUOTATIONS & WORK PAGE
          ========================================================================= */}
      {selectedUser ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Back Navigation & User Header */}
          <div
            style={{
              padding: '20px 24px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
                icon={ArrowLeft}
                onClick={() => {
                  setSelectedUser(null);
                  setUserWorkData(null);
                }}
                style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600 }}
              >
                Back to All Users
              </Button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: selectedUser.role === 'admin' ? '#ede9fe' : '#ecfdf5',
                    color: selectedUser.role === 'admin' ? '#6d28d9' : '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '18px',
                    flexShrink: 0
                  }}
                >
                  {selectedUser.name ? selectedUser.name[0].toUpperCase() : selectedUser.email[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                      {selectedUser.name || 'Staff User'}
                    </h2>
                    <Badge variant={selectedUser.role === 'admin' ? 'primary' : 'neutral'}>
                      {(selectedUser.role || 'staff').toUpperCase()}
                    </Badge>
                    {selectedUser.isSuperAdmin && <Badge variant="warning">Super Admin</Badge>}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
                    {selectedUser.email} • Joined {selectedUser.createdAt ? formatDisplayDate(selectedUser.createdAt) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Button
                variant="secondary"
                icon={ExternalLink}
                onClick={() =>
                  navigate(`/quotations?staff=${encodeURIComponent(selectedUser.name || selectedUser.email)}`)
                }
                title="Filter full Quotation Register for this staff"
                style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600 }}
              >
                Open in Quotation Register
              </Button>
              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={refreshCurrentDossier}
                disabled={isLoadingUserWork}
                style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600 }}
              >
                Refresh Data
              </Button>
            </div>
          </div>

          {/* Quick Metrics Cards for This User */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px'
            }}
          >
            <div
              style={{
                padding: '20px 22px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05)'
              }}
            >
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#64748b'
                }}
              >
                Total Quotations Created
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: '#b3261e', lineHeight: 1.1 }}>
                {userWorkData?.quotations?.length || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                Generated by {selectedUser.name || selectedUser.email}
              </div>
            </div>

            <div
              style={{
                padding: '20px 22px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05)'
              }}
            >
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#64748b'
                }}
              >
                Gross Value of Quotes
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: '#059669', lineHeight: 1.1 }}>
                {formatCurrency(
                  (userWorkData?.quotations || []).reduce(
                    (acc, q) => acc + (q.grandTotal || q.totals?.grandTotal || q.financials?.grandTotal || 0),
                    0
                  )
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                Total commercial value drafted
              </div>
            </div>

            <div
              style={{
                padding: '20px 22px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05)'
              }}
            >
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#64748b'
                }}
              >
                Confirmed Orders (Accepted)
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: '#16a34a', lineHeight: 1.1 }}>
                {(userWorkData?.quotations || []).filter((q) => q.status === 'Accepted').length} Quotes
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                Converted to active orders
              </div>
            </div>

            <div
              style={{
                padding: '20px 22px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05)'
              }}
            >
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#64748b'
                }}
              >
                Review / Pending Corrections
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: '#d97706', lineHeight: 1.1 }}>
                {(userWorkData?.quotations || []).filter((q) => q.status === 'Pending').length} Quotes
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                Need revision or staff correction
              </div>
            </div>
          </div>

          {/* Dossier Tabs: Quotations vs Activity Log */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #f1f5f9',
                padding: '0 24px',
                flexWrap: 'wrap',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setUserWorkTab('quotations')}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    background: 'none',
                    fontSize: '13.5px',
                    fontWeight: userWorkTab === 'quotations' ? 700 : 500,
                    color: userWorkTab === 'quotations' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    borderBottom:
                      userWorkTab === 'quotations' ? '2px solid var(--color-primary)' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <FileSpreadsheet size={15} />
                  <span>Quotations Generated ({userWorkData?.quotations?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUserWorkTab('activity')}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    background: 'none',
                    fontSize: '13.5px',
                    fontWeight: userWorkTab === 'activity' ? 700 : 500,
                    color: userWorkTab === 'activity' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    borderBottom:
                      userWorkTab === 'activity' ? '2px solid var(--color-primary)' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Activity size={15} />
                  <span>User Audit Trail &amp; Actions ({userWorkData?.activityLogs?.length || 0})</span>
                </button>
              </div>

              {userWorkTab === 'quotations' && (
                <div className="flex items-center gap-8" style={{ padding: '8px 0' }}>
                  <div className="search-box" style={{ width: 220 }}>
                    <Search className="search-icon" size={14} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '6px 10px 6px 30px', fontSize: 12 }}
                      placeholder="Search quote or client..."
                      value={quoteSearchTerm}
                      onChange={(e) => setQuoteSearchTerm(e.target.value)}
                    />
                  </div>

                  <select
                    className="form-select"
                    style={{ padding: '6px 10px', fontSize: 12, width: 140 }}
                    value={quoteStatusFilter}
                    onChange={(e) => setQuoteStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All Status</option>
                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending (Review)</option>
                    <option value="Sent">Sent / Approved</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ padding: '24px' }}>
              {isLoadingUserWork ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <RefreshCw
                    size={28}
                    style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }}
                  />
                  <div className="text-caption text-muted" style={{ marginTop: 10 }}>
                    Loading user quotation overview and logs...
                  </div>
                </div>
              ) : userWorkTab === 'quotations' ? (
                /* Tab 1: Comprehensive Quotation Overview Table */
                userQuotationsList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }} className="text-muted text-caption">
                    No quotations found matching your filter for this staff member.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                          <th style={{ textAlign: 'left', padding: '10px 14px' }}>Quotation #</th>
                          <th style={{ textAlign: 'left', padding: '10px 14px' }}>Customer &amp; Subject</th>
                          <th style={{ textAlign: 'left', padding: '10px 14px' }}>Date</th>
                          <th style={{ textAlign: 'right', padding: '10px 14px' }}>Grand Total</th>
                          <th style={{ textAlign: 'center', padding: '10px 14px' }}>Status</th>
                          <th style={{ textAlign: 'left', padding: '10px 14px' }}>Remarks / Feedback</th>
                          <th style={{ textAlign: 'right', padding: '10px 14px' }}>Admin Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userQuotationsList.map((q) => {
                          const qNo = q.quotationNo || q.quotationNumber;
                          const grandTotal =
                            q.grandTotal || q.totals?.grandTotal || q.financials?.grandTotal || 0;
                          const clientName =
                            q.customerName || q.customer?.name || (q.customerId && q.customerId.companyName) || 'N/A';
                          const hasRemark = Boolean(q.approvalNote || q.notes);

                          return (
                            <tr key={q.id || q._id || qNo} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '12px 14px' }}>
                                <div className="text-bold" style={{ color: 'var(--color-primary)', fontSize: 13 }}>
                                  {qNo}
                                </div>
                                <div className="text-caption text-muted" style={{ fontSize: 11 }}>
                                  {q.revisionLabel || 'Rev 1'}
                                </div>
                              </td>

                              <td style={{ padding: '12px 14px' }}>
                                <div className="text-bold" style={{ fontSize: 13 }}>
                                  {clientName}
                                </div>
                                {q.subject && (
                                  <div
                                    className="text-caption text-muted"
                                    style={{
                                      fontSize: 11,
                                      maxWidth: 240,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                    title={q.subject}
                                  >
                                    {q.subject}
                                  </div>
                                )}
                              </td>

                              <td style={{ padding: '12px 14px', fontSize: 12 }} className="text-muted">
                                {q.quotationDate
                                  ? formatDisplayDate(q.quotationDate)
                                  : q.createdAt
                                  ? formatDisplayDate(q.createdAt)
                                  : 'N/A'}
                              </td>

                              <td
                                style={{
                                  padding: '12px 14px',
                                  textAlign: 'right',
                                  fontWeight: 700,
                                  fontSize: 13,
                                  color: 'var(--color-text)'
                                }}
                              >
                                {formatCurrency(grandTotal)}
                              </td>

                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <Badge variant={STATUS_VARIANTS[q.status] || 'neutral'}>
                                  {q.status || 'Draft'}
                                </Badge>
                              </td>

                              <td style={{ padding: '12px 14px' }}>
                                {hasRemark ? (
                                  <div
                                    style={{
                                      fontSize: 11.5,
                                      backgroundColor: '#fef3c7',
                                      padding: '4px 8px',
                                      borderRadius: 4,
                                      color: '#92400e',
                                      maxWidth: 260,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                    title={q.approvalNote || q.notes}
                                  >
                                    <MessageSquare size={12} style={{ flexShrink: 0 }} />
                                    <span
                                      style={{
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}
                                    >
                                      {q.approvalNote || q.notes}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-caption text-muted" style={{ fontStyle: 'italic', fontSize: 11 }}>
                                    No remarks
                                  </span>
                                )}
                              </td>

                              <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div className="flex items-center justify-end gap-6" style={{ flexWrap: 'nowrap' }}>
                                  {/* Quick Complete Overview (Full Doc Preview Modal) */}
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={Eye}
                                    onClick={() => setPreviewingQuotation(q)}
                                    title="Complete quotation overview without missing any detail"
                                  >
                                    Overview
                                  </Button>

                                  {/* Quick Approve Button */}
                                  {q.status !== 'Approved' && q.status !== 'Accepted' && (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      icon={CheckCircle2}
                                      onClick={() => handleDirectAction(q, 'Approved')}
                                      style={{
                                        backgroundColor: '#16a34a',
                                        color: '#ffffff',
                                        borderColor: '#16a34a'
                                      }}
                                      title="Approve this quotation"
                                    >
                                      Approve
                                    </Button>
                                  )}

                                  {/* Quick Reject Button */}
                                  {q.status !== 'Rejected' && (
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      icon={XCircle}
                                      onClick={() => handleOpenRemarkModal(q, 'Rejected')}
                                      title="Reject and send remark to staff"
                                    >
                                      Reject
                                    </Button>
                                  )}

                                  {/* Send Remark / Correction button */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={MessageSquare}
                                    onClick={() => handleOpenRemarkModal(q, 'Pending')}
                                    style={{ color: '#d97706' }}
                                    title="Send correction instructions / remark to staff"
                                  >
                                    Remark
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                /* Tab 2: Activity Logs */
                (!userWorkData?.activityLogs || userWorkData.activityLogs.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '40px' }} className="text-muted text-caption">
                    No activity logs recorded for this user.
                  </div>
                ) : (
                  <div className="flex-col gap-10">
                    {userWorkData.activityLogs.map((log, idx) => (
                      <div
                        key={log.id || log._id || idx}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: '#f8fafc',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12
                        }}
                      >
                        <div className="flex items-center gap-10">
                          <Activity size={16} style={{ color: 'var(--color-primary)' }} />
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{log.action || 'Event'}</span>
                            {log.quotationNo && (
                              <span
                                style={{
                                  marginLeft: 8,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  color: 'var(--color-primary)'
                                }}
                              >
                                [{log.quotationNo}]
                              </span>
                            )}
                            <span style={{ marginLeft: 8, color: 'var(--color-text-muted)', fontSize: 12 }}>
                              {log.note || log.details || log.description || ''}
                            </span>
                          </div>
                        </div>

                        <div className="text-caption text-muted" style={{ fontSize: 11 }}>
                          {log.timestamp || log.createdAt ? formatDisplayDate(log.timestamp || log.createdAt) : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            VIEW B: DIRECTORY OF ALL AUTHORIZED USERS & STAFF
            ========================================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Header Title & Top Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px',
              paddingBottom: '6px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: 'rgba(179, 38, 30, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary)'
                  }}
                >
                  <UserCheck size={24} />
                </div>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    Authorized Users &amp; Staff
                  </h1>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                    Track individual staff quotation performance, inspect generated quotes, and send correction remarks.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={fetchUsers}
                disabled={isUsersLoading}
                style={{ padding: '9px 16px', fontSize: '13px', fontWeight: 600 }}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                icon={UserPlus}
                onClick={() => {
                  setUserModalError('');
                  setIsAddUserModalOpen(true);
                }}
                style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 600 }}
              >
                Add User / Staff
              </Button>
            </div>
          </div>

          {/* Firm Performance Metric Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px'
            }}
          >
            {/* Metric 1 */}
            <div
              style={{
                padding: '22px 24px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#64748b'
                  }}
                >
                  Total Accounts
                </div>
                <div
                  style={{
                    fontSize: '30px',
                    fontWeight: 800,
                    marginTop: '8px',
                    color: '#b3261e',
                    lineHeight: 1.1
                  }}
                >
                  {totalUsersCount} Users
                </div>
              </div>
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '12.5px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ fontWeight: 600, color: '#334155' }}>{adminMembersCount} Admins</span>
                <span>•</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>{staffMembersCount} Staff</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div
              style={{
                padding: '22px 24px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#64748b'
                  }}
                >
                  Active Quotation Staff
                </div>
                <div
                  style={{
                    fontSize: '30px',
                    fontWeight: 800,
                    marginTop: '8px',
                    color: '#059669',
                    lineHeight: 1.1
                  }}
                >
                  {staffMembersCount} Members
                </div>
              </div>
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '12.5px',
                  color: '#64748b'
                }}
              >
                Authorized for drafting client proposals
              </div>
            </div>

            {/* Metric 3 */}
            <div
              style={{
                padding: '22px 24px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#64748b'
                  }}
                >
                  Live Quotation Register
                </div>
                <div style={{ marginTop: '12px' }}>
                  <Button
                    variant="secondary"
                    icon={ExternalLink}
                    onClick={() => navigate('/quotations')}
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '9px 16px',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  >
                    Open Full Register
                  </Button>
                </div>
              </div>
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '12px',
                  color: '#64748b',
                  textAlign: 'center'
                }}
              >
                Cross-reference &amp; inspect all proposals
              </div>
            </div>
          </div>

          {/* Directory Card with Clean Spacing & Table Layout */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05)',
              overflow: 'hidden'
            }}
          >
            {/* Filter Bar Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                backgroundColor: '#ffffff'
              }}
            >
              {/* Search Box */}
              <div
                style={{
                  position: 'relative',
                  width: '320px',
                  maxWidth: '100%'
                }}
              >
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8'
                  }}
                />
                <input
                  type="text"
                  placeholder="Search by staff name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 14px 9px 38px',
                    fontSize: '13.5px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#b3261e';
                    e.target.style.backgroundColor = '#ffffff';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.backgroundColor = '#f8fafc';
                  }}
                />
              </div>

              {/* Segmented Filter Pills */}
              <div
                style={{
                  display: 'inline-flex',
                  backgroundColor: '#f1f5f9',
                  padding: '4px',
                  borderRadius: '8px',
                  gap: '4px'
                }}
              >
                {[
                  { id: 'ALL', label: 'All Users', count: totalUsersCount },
                  { id: 'STAFF', label: 'Staff', count: staffMembersCount },
                  { id: 'ADMIN', label: 'Admins', count: adminMembersCount }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRoleFilter(item.id)}
                    style={{
                      border: 'none',
                      backgroundColor: roleFilter === item.id ? '#ffffff' : 'transparent',
                      color: roleFilter === item.id ? '#b3261e' : '#64748b',
                      fontWeight: roleFilter === item.id ? 700 : 500,
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      boxShadow: roleFilter === item.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{item.label}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        backgroundColor: roleFilter === item.id ? '#fee2e2' : '#e2e8f0',
                        color: roleFilter === item.id ? '#991b1b' : '#475569'
                      }}
                    >
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Directory Table */}
            <div>
              {isUsersLoading ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <RefreshCw
                    size={32}
                    style={{ animation: 'spin 1s linear infinite', color: '#b3261e', margin: '0 auto' }}
                  />
                  <div style={{ marginTop: '14px', fontSize: '13.5px', color: '#64748b' }}>
                    Loading user &amp; staff performance records...
                  </div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', fontSize: '14px' }}>
                  No authorized users found matching your search.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr
                        style={{
                          backgroundColor: '#f8fafc',
                          borderBottom: '1px solid #e2e8f0',
                          color: '#475569',
                          fontSize: '12px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}
                      >
                        <th style={{ padding: '16px 20px', width: '25%', whiteSpace: 'nowrap' }}>User &amp; Staff Member</th>
                        <th style={{ padding: '16px 16px', width: '10%', whiteSpace: 'nowrap' }}>Access Role</th>
                        <th style={{ padding: '16px 16px', width: '16%', textAlign: 'center', whiteSpace: 'nowrap' }}>Quotations Created</th>
                        <th style={{ padding: '16px 16px', width: '16%', textAlign: 'right', whiteSpace: 'nowrap' }}>Drafted Volume</th>
                        <th style={{ padding: '16px 16px', width: '13%', whiteSpace: 'nowrap' }}>Joined Date</th>
                        <th style={{ padding: '16px 20px', width: '20%', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const isSelf = currentUser?.userId === (u.id || u._id);
                        const quoteCount = u.quotationsCount !== undefined ? u.quotationsCount : 0;
                        const grossVal = u.totalValue !== undefined ? u.totalValue : 0;

                        return (
                          <tr
                            key={u.id || u._id}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              backgroundColor: '#ffffff',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#fafafa';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ffffff';
                            }}
                          >
                            {/* Column 1: User & Avatar */}
                            <td style={{ padding: '18px 24px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div
                                  style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: '50%',
                                    backgroundColor: u.isSuperAdmin
                                      ? '#fee2e2'
                                      : u.role === 'admin'
                                      ? '#ede9fe'
                                      : '#ecfdf5',
                                    color: u.isSuperAdmin ? '#dc2626' : u.role === 'admin' ? '#6d28d9' : '#059669',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '15px',
                                    flexShrink: 0
                                  }}
                                >
                                  {u.name ? u.name[0].toUpperCase() : u.email ? u.email[0].toUpperCase() : 'U'}
                                </div>
                                <div>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px'
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        color: '#0f172a'
                                      }}
                                    >
                                      {u.name || (u.isSuperAdmin ? 'Master Super Admin' : 'Pocika Staff')}
                                    </span>
                                    {isSelf && (
                                      <span
                                        style={{
                                          fontSize: '10px',
                                          backgroundColor: '#f1f5f9',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          color: '#475569',
                                          fontWeight: 700
                                        }}
                                      >
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px' }}>
                                    {u.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Column 2: Role */}
                            <td style={{ padding: '18px 20px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  letterSpacing: '0.04em',
                                  textTransform: 'uppercase',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: u.role === 'admin' ? '#ede9fe' : '#f1f5f9',
                                  color: u.role === 'admin' ? '#6d28d9' : '#475569'
                                }}
                              >
                                {u.role ? u.role.toUpperCase() : 'STAFF'}
                              </span>
                            </td>

                            {/* Column 3: Quotations Count */}
                            <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 12px',
                                  borderRadius: '20px',
                                  backgroundColor: quoteCount > 0 ? '#f0fdf4' : '#f8fafc',
                                  border: quoteCount > 0 ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                                  color: quoteCount > 0 ? '#15803d' : '#64748b',
                                  fontSize: '12.5px',
                                  fontWeight: 600
                                }}
                              >
                                <FileSpreadsheet size={14} />
                                {quoteCount} {quoteCount === 1 ? 'Quotation' : 'Quotations'}
                              </span>
                            </td>

                            {/* Column 4: Gross Drafted Volume */}
                            <td
                              style={{
                                padding: '18px 20px',
                                textAlign: 'right',
                                fontWeight: 700,
                                fontSize: '14.5px',
                                color: '#0f172a'
                              }}
                            >
                              {formatCurrency(grossVal)}
                            </td>

                            {/* Column 5: Joined Date */}
                            <td style={{ padding: '18px 20px', fontSize: '13px', color: '#64748b' }}>
                              {u.createdAt ? formatDisplayDate(u.createdAt) : 'N/A'}
                            </td>

                            {/* Column 6: Actions with Distinct Margin & Padding */}
                            <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'nowrap' }}>
                                {/* Primary Inspect Button */}
                                <button
                                  type="button"
                                  onClick={() => loadUserWorkDossier(u)}
                                  style={{
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: '#ffffff',
                                    color: '#0f172a',
                                    fontWeight: 600,
                                    fontSize: '12.5px',
                                    padding: '7px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#b3261e';
                                    e.currentTarget.style.color = '#b3261e';
                                    e.currentTarget.style.backgroundColor = '#fff5f5';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                    e.currentTarget.style.color = '#0f172a';
                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                  }}
                                >
                                  <span style={{ whiteSpace: 'nowrap' }}>Inspect Work</span>
                                  <ChevronRight size={14} style={{ flexShrink: 0 }} />
                                </button>

                                {!u.isSuperAdmin && (
                                  <>
                                    {/* Role toggle button */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleUserRole(u)}
                                      style={{
                                        border: '1px solid #e2e8f0',
                                        backgroundColor: '#f8fafc',
                                        color: '#475569',
                                        fontWeight: 500,
                                        fontSize: '12px',
                                        padding: '7px 12px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.15s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                                        e.currentTarget.style.color = '#0f172a';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f8fafc';
                                        e.currentTarget.style.color = '#475569';
                                      }}
                                      title={`Switch to ${u.role === 'admin' ? 'Staff' : 'Admin'}`}
                                    >
                                      Make {u.role === 'admin' ? 'Staff' : 'Admin'}
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u)}
                                      style={{
                                        border: '1px solid #fee2e2',
                                        backgroundColor: '#fff5f5',
                                        color: '#dc2626',
                                        padding: '7px 10px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        transition: 'all 0.15s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#fee2e2';
                                        e.currentTarget.style.borderColor = '#fca5a5';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#fff5f5';
                                        e.currentTarget.style.borderColor = '#fee2e2';
                                      }}
                                      title="Delete user account"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: COMPLETE QUOTATION OVERVIEW (NO DETAIL MISSED)
          ========================================================================= */}
      {previewingQuotation && (
        <QuotationPreviewModal
          isOpen={Boolean(previewingQuotation)}
          onClose={() => setPreviewingQuotation(null)}
          quotationData={previewingQuotation}
          company={company}
        />
      )}

      {/* =========================================================================
          MODAL 2: SEND REMARK & CORRECTION INSTRUCTIONS TO STAFF
          ========================================================================= */}
      {remarkModalQuotation && (
        <Modal
          isOpen={Boolean(remarkModalQuotation)}
          onClose={() => setRemarkModalQuotation(null)}
          title={
            <div className="flex items-center gap-8">
              <RotateCcw size={18} style={{ color: '#d97706' }} />
              <span>
                Staff Correction Remark —{' '}
                {remarkModalQuotation.quotationNo || remarkModalQuotation.quotationNumber}
              </span>
            </div>
          }
          size="md"
          footer={
            <div className="flex items-center justify-end gap-8 w-full">
              <Button
                variant="secondary"
                onClick={() => setRemarkModalQuotation(null)}
                disabled={isSubmittingRemark}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitRemark}
                disabled={isSubmittingRemark || !adminRemarkText.trim()}
                style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}
              >
                {isSubmittingRemark ? 'Sending...' : 'Send Remark to Staff'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSubmitRemark} className="flex-col gap-16">
            <div
              style={{
                padding: '12px 14px',
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
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>
                This quotation will be returned to the staff member with your feedback notes so they can make the required changes immediately.
              </span>
            </div>

            <Select
              label="Update Status to"
              value={targetStatusForRemark}
              onChange={(e) => setTargetStatusForRemark(e.target.value)}
              options={[
                { value: 'Pending', label: 'Pending (Returned for Corrections / Changes)' },
                { value: 'Draft', label: 'Draft (Reset to Internal Draft)' },
                { value: 'Rejected', label: 'Rejected (Declined)' }
              ]}
              required
            />

            <Input
              label="Admin Correction Remark / Instructions"
              value={adminRemarkText}
              onChange={(e) => setAdminRemarkText(e.target.value)}
              placeholder="e.g. Please reduce the discount on item #2 by 5%, or update the delivery timeline to 15 days."
              multiline
              rows={4}
              required
              autoFocus
            />
          </form>
        </Modal>
      )}

      {/* =========================================================================
          MODAL 3: ADD NEW USER / STAFF
          ========================================================================= */}
      {isAddUserModalOpen && (
        <Modal
          isOpen={isAddUserModalOpen}
          onClose={() => {
            setUserModalError('');
            setIsAddUserModalOpen(false);
          }}
          title="Create Authorized User / Staff"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-8 w-full">
              <Button
                variant="secondary"
                onClick={() => {
                  setUserModalError('');
                  setIsAddUserModalOpen(false);
                }}
                disabled={isSubmittingUser}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={UserPlus}
                onClick={handleCreateUser}
                disabled={
                  isSubmittingUser ||
                  !newUserData.email.trim() ||
                  !newUserData.password ||
                  newUserData.password.length < 6 ||
                  !newUserData.role
                }
              >
                {isSubmittingUser ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleCreateUser} className="flex-col gap-16">
            {userModalError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#b91c1c',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px'
                }}
              >
                <AlertTriangle size={16} className="flex-shrink-0" />
                <span>{userModalError}</span>
              </div>
            )}

            <div>
              <label className="form-label required">Email Address (Login ID)</label>
              <Input
                type="email"
                required
                value={newUserData.email}
                onChange={(e) => {
                  setUserModalError('');
                  setNewUserData((prev) => ({ ...prev, email: e.target.value }));
                }}
                placeholder="staff@pocika.com"
                autoFocus
              />
            </div>

            <div>
              <label className="form-label">Full Name / Display Name</label>
              <Input
                value={newUserData.name}
                onChange={(e) => setNewUserData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Rahul Sharma"
              />
            </div>

            <div>
              <label className="form-label required">Password (Min. 6 characters)</label>
              <Input
                type="password"
                required
                value={newUserData.password}
                onChange={(e) => {
                  setUserModalError('');
                  setNewUserData((prev) => ({ ...prev, password: e.target.value }));
                }}
                placeholder="Secure password"
              />
            </div>

            <div>
              <Select
                label="Access Role"
                required
                value={newUserData.role}
                onChange={(e) => {
                  setUserModalError('');
                  setNewUserData((prev) => ({ ...prev, role: e.target.value }));
                }}
                options={[
                  { value: 'staff', label: 'Staff (Quotation creation, customer communication)' },
                  { value: 'admin', label: 'Admin (Full access to all settings, tracking & masters)' }
                ]}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default AuthorizedUsers;
