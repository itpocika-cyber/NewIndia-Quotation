import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { useMasters } from '../../context/MastersContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { validateBackupData } from '../../utils/exportUtils';
import { CompanyMaster } from '../masters/CompanyMaster';
import {
  Settings as SettingsIcon,
  Building2,
  FileSpreadsheet,
  FileText,
  Database,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Save,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  Lock,
  ShieldAlert,
  KeyRound,
  Users as UsersIcon,
  RefreshCw,
  Mail,
  User,
  ExternalLink,
  Eye,
  Activity,
  Filter
} from 'lucide-react';
import { formatCurrency, formatDisplayDate } from '../../utils/calculations';

export function Settings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser, isAdmin } = useAuth();
  const {
    company,
    settings,
    updateSettings,
    exportFullBackupJSON,
    importFullBackupJSON,
    resetAllData,
    quotations,
    customers,
    products
  } = useMasters();
  const { success, error, warning, info } = useToast();

  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'quotation'); // 'quotation' | 'pdf' | 'company' | 'data' | 'users'

  // Sync tab with URL if changed
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Quotation & PDF settings form state
  const [formData, setFormData] = useState({
    quotationPrefix: settings.quotationPrefix || 'QT',
    quotationStartNumber: settings.quotationStartNumber || 1,
    quotationYearFormat: settings.quotationYearFormat || 'YYYY',
    defaultValidityDays: settings.defaultValidityDays || 30,
    currencySymbol: settings.currencySymbol || '₹',
    decimalPrecision: settings.decimalPrecision || 2,
    showBankDetailsOnPDF: settings.showBankDetailsOnPDF !== false,
    showSignatureOnPDF: settings.showSignatureOnPDF !== false,
    signatureSealHeight: settings.signatureSealHeight || 170,
    signatureSealScale: settings.signatureSealScale || 1.15,
    customFooterText: settings.customFooterText || 'Thank you for your business! | This is a Computer Generated Quotation | Regd. Office: Surat, Gujarat | Subject to Surat Jurisdiction.'
  });

  // Data Management States
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  // User Management States (Admin Only)
  const [usersList, setUsersList] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userModalError, setUserModalError] = useState('');
  const [newUserData, setNewUserData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'staff'
  });

  // User Dossier & Tracking States
  const [selectedUserWork, setSelectedUserWork] = useState(null);
  const [isLoadingUserWork, setIsLoadingUserWork] = useState(false);
  const [isUserWorkModalOpen, setIsUserWorkModalOpen] = useState(false);
  const [userWorkTab, setUserWorkTab] = useState('quotations'); // 'quotations' | 'activity'
  const [userFilterRole, setUserFilterRole] = useState('ALL'); // 'ALL' | 'admin' | 'staff'

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setIsUsersLoading(true);
      const data = await api.users.getAll();
      setUsersList(data);
    } catch (err) {
      error('Failed to load users', err.message || 'Error fetching user directory.');
    } finally {
      setIsUsersLoading(false);
    }
  }, [isAdmin, error]);

  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      fetchUsers();
    }
  }, [activeTab, isAdmin, fetchUsers]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    updateSettings(formData);
    success('Settings Updated', 'New configuration rules saved successfully.');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result);
        const validation = validateBackupData(parsed);

        if (!validation.valid) {
          error('Invalid Backup File', validation.error || 'JSON structure not recognized.');
          return;
        }

        setImportFile(parsed);
        setImportPreview(validation.counts);
        setIsImportModalOpen(true);
      } catch (err) {
        error('File Parse Error', 'Selected file is not valid JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleConfirmImport = () => {
    if (!importFile) return;
    try {
      importFullBackupJSON(importFile);
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportPreview(null);
      success('Backup Restored', 'Database successfully restored from JSON backup.');
    } catch (err) {
      error('Import Failed', err.message || 'Error restoring database.');
    }
  };

  const handleConfirmReset = () => {
    if (resetConfirmText.trim().toUpperCase() !== 'DELETE') {
      warning('Confirmation Required', 'Please type DELETE in capital letters to confirm.');
      return;
    }

    resetAllData();
    setIsResetModalOpen(false);
    setResetConfirmText('');
    success('System Reset', 'All data has been cleared and reset to fresh seed state.');
  };

  const handleCreateUser = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setUserModalError('');

    if (!newUserData.email || !newUserData.email.trim()) {
      setUserModalError('Email address is required.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(newUserData.email.trim())) {
      setUserModalError('Please enter a valid email address (e.g. staff@pocika.com).');
      return;
    }
    if (!newUserData.password) {
      setUserModalError('Password is required.');
      return;
    }
    if (newUserData.password.length < 6) {
      setUserModalError('Password must be at least 6 characters long.');
      return;
    }
    if (!newUserData.role) {
      setUserModalError("Access role is required. Please select either 'Staff' or 'Admin'.");
      return;
    }

    try {
      setIsSubmittingUser(true);
      await api.users.create(newUserData);
      success('User Created', `User ${newUserData.email} created successfully with role ${newUserData.role.toUpperCase()}.`);
      setNewUserData({ email: '', name: '', password: '', role: 'staff' });
      setUserModalError('');
      setIsAddUserModalOpen(false);
      await fetchUsers();
    } catch (err) {
      const specificError = err.data?.error || err.message || 'Could not create new user.';
      setUserModalError(specificError);
      error('Creation Failed', specificError);
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleToggleUserRole = async (targetUser) => {
    if (targetUser.isSuperAdmin) {
      error('Action Prohibited', 'The master super-admin account cannot be modified.');
      return;
    }
    const newRole = targetUser.role === 'admin' ? 'staff' : 'admin';
    const confirmed = window.confirm(`Change access role for "${targetUser.email}" from ${targetUser.role.toUpperCase()} to ${newRole.toUpperCase()}?`);
    if (!confirmed) return;

    try {
      await api.users.update(targetUser.id || targetUser._id, { role: newRole });
      success('Role Updated', `${targetUser.email} is now assigned the ${newRole.toUpperCase()} role.`);
      await fetchUsers();
    } catch (err) {
      error('Update Failed', err.message || 'Could not update role.');
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.isSuperAdmin) {
      error('Action Prohibited', 'The master super-admin account cannot be deleted.');
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to permanently delete user "${targetUser.email}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await api.users.delete(targetUser.id || targetUser._id);
      success('User Deleted', `User ${targetUser.email} has been removed.`);
      await fetchUsers();
    } catch (err) {
      error('Delete Failed', err.message || 'Could not delete user.');
    }
  };

  const handleViewUserWork = async (targetUser) => {
    try {
      setIsLoadingUserWork(true);
      setIsUserWorkModalOpen(true);
      setUserWorkTab('quotations');
      const workData = await api.users.getUserWork(targetUser.id || targetUser._id);
      setSelectedUserWork(workData);
    } catch (err) {
      error('Failed to load dossier', err.message || 'Could not fetch user activity.');
    } finally {
      setIsLoadingUserWork(false);
    }
  };

  return (
    <div className="flex-col gap-24">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h1 className="heading-main" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SettingsIcon size={24} style={{ color: 'var(--color-primary)' }} />
            System &amp; Quotation Settings
          </h1>
          <p className="text-caption text-muted" style={{ marginTop: 4 }}>
            Configure numbering sequences, PDF letterhead options, authorized users, and JSON backup management.
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'quotation' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('quotation');
            setSearchParams({ tab: 'quotation' });
          }}
        >
          <FileSpreadsheet size={15} style={{ marginRight: 6 }} />
          Quotation Config
        </button>

        <button
          className={`tab-btn ${activeTab === 'pdf' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('pdf');
            setSearchParams({ tab: 'pdf' });
          }}
        >
          <FileText size={15} style={{ marginRight: 6 }} />
          PDF &amp; Letterhead
        </button>

        <button
          className={`tab-btn ${activeTab === 'company' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('company');
            setSearchParams({ tab: 'company' });
          }}
        >
          <Building2 size={15} style={{ marginRight: 6 }} />
          Company Profile
        </button>

        <button
          className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('data');
            setSearchParams({ tab: 'data' });
          }}
        >
          <Database size={15} style={{ marginRight: 6 }} />
          Backup &amp; Data
        </button>
      </div>

      {/* =========================================================================
          TAB 1: QUOTATION CONFIGURATION
          ========================================================================= */}
      {activeTab === 'quotation' && (
        <form onSubmit={handleSaveSettings} className="flex-col gap-20">
          <Card>
            <CardHeader>
              <div>
                <h3 className="heading-sub" style={{ fontSize: '15px' }}>Numbering Rules &amp; Sequencing</h3>
                <p className="text-caption text-muted">
                  Defines how new quotation numbers are formatted (affects new quotations only).
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <div className="form-grid-3">
                <div>
                  <label className="form-label required">Quotation Prefix</label>
                  <Input
                    value={formData.quotationPrefix}
                    onChange={(e) => handleFieldChange('quotationPrefix', e.target.value.toUpperCase())}
                    placeholder="e.g. POC-QT or QT"
                    required
                  />
                  <div className="text-caption text-muted" style={{ marginTop: 4 }}>
                    Prefix code (e.g. <code>POC-QT</code> or <code>QT</code>)
                  </div>
                </div>

                <div>
                  <label className="form-label">Year Format in Sequence</label>
                  <Select
                    value={formData.quotationYearFormat}
                    onChange={(e) => handleFieldChange('quotationYearFormat', e.target.value)}
                    options={[
                      { value: 'YYYY', label: '4-Digit Year (e.g. QT-2026-0001)' },
                      { value: 'YY', label: '2-Digit Year (e.g. QT-26-0001)' },
                      { value: 'NONE', label: 'No Year (e.g. QT-0001)' }
                    ]}
                  />
                  <div className="text-caption text-muted" style={{ marginTop: 4 }}>
                    Includes current calendar year
                  </div>
                </div>

                <div>
                  <label className="form-label">Default Validity Period (Days)</label>
                  <Select
                    value={formData.defaultValidityDays}
                    onChange={(e) => handleFieldChange('defaultValidityDays', parseInt(e.target.value) || 30)}
                    options={[
                      { value: 15, label: '15 Days' },
                      { value: 30, label: '30 Days (Standard)' },
                      { value: 45, label: '45 Days' },
                      { value: 60, label: '60 Days' },
                      { value: 90, label: '90 Days' }
                    ]}
                  />
                  <div className="text-caption text-muted" style={{ marginTop: 4 }}>
                    Auto-calculates Valid Till date
                  </div>
                </div>
              </div>

              <div className="form-grid-2" style={{ marginTop: 16 }}>
                <div>
                  <label className="form-label">Currency Symbol</label>
                  <Input
                    value={formData.currencySymbol}
                    onChange={(e) => handleFieldChange('currencySymbol', e.target.value)}
                    placeholder="e.g. ₹"
                  />
                </div>

                <div>
                  <label className="form-label">Decimal Precision</label>
                  <Select
                    value={formData.decimalPrecision}
                    onChange={(e) => handleFieldChange('decimalPrecision', parseInt(e.target.value) || 2)}
                    options={[
                      { value: 2, label: '2 Decimals (e.g. ₹ 100.00)' },
                      { value: 0, label: '0 Decimals (e.g. ₹ 100)' }
                    ]}
                  />
                </div>
              </div>

              {/* Live Format Preview Box */}
              <div
                style={{
                  marginTop: 20,
                  padding: '14px 18px',
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-button)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div className="text-caption text-muted">Next Generated Quotation Number Preview</div>
                  <div className="text-bold" style={{ fontSize: '16px', color: 'var(--color-primary)', marginTop: 2 }}>
                    {formData.quotationPrefix}-{formData.quotationYearFormat === 'YYYY' ? new Date().getFullYear() : formData.quotationYearFormat === 'YY' ? String(new Date().getFullYear()).slice(-2) : ''}{formData.quotationYearFormat !== 'NONE' ? '-' : ''}0001
                  </div>
                </div>
                <Badge variant="info">Sequential 4-digit</Badge>
              </div>
            </CardBody>
          </Card>

          <div className="flex justify-end">
            <Button variant="primary" icon={Save} type="submit">
              Save Quotation Settings
            </Button>
          </div>
        </form>
      )}

      {/* =========================================================================
          TAB 2: PDF & LETTERHEAD CONTROLS
          ========================================================================= */}
      {activeTab === 'pdf' && (
        <form onSubmit={handleSaveSettings} className="flex-col gap-20">
          <Card>
            <CardHeader>
              <div>
                <h3 className="heading-sub" style={{ fontSize: '15px' }}>PDF Export &amp; Document Display Options</h3>
                <p className="text-caption text-muted">
                  Toggle dynamic sections and customize corporate footer statements on A4 quotations.
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex-col gap-16">
                {/* Toggle 1: Bank Details */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '14px 16px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-button)',
                    backgroundColor: formData.showBankDetailsOnPDF ? '#f0fdf4' : 'var(--color-surface)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.showBankDetailsOnPDF}
                    onChange={(e) => handleFieldChange('showBankDetailsOnPDF', e.target.checked)}
                    style={{ marginTop: 3, width: 16, height: 16 }}
                  />
                  <div>
                    <div className="text-bold" style={{ fontSize: '14px' }}>
                      Show Direct RTGS / NEFT Wire Settlement Box on PDF
                    </div>
                    <div className="text-caption text-muted" style={{ marginTop: 2 }}>
                      Includes Beneficiary Name, HDFC Bank, Current A/C, IFSC Code, Branch and UPI ID.
                    </div>
                  </div>
                </label>

                {/* Toggle 2: Authorized Signature */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '14px 16px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-button)',
                    backgroundColor: formData.showSignatureOnPDF ? '#f0fdf4' : 'var(--color-surface)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.showSignatureOnPDF}
                    onChange={(e) => handleFieldChange('showSignatureOnPDF', e.target.checked)}
                    style={{ marginTop: 3, width: 16, height: 16 }}
                  />
                  <div>
                    <div className="text-bold" style={{ fontSize: '14px' }}>
                      Show Authorized Signatory Seal &amp; Digital Signature on PDF
                    </div>
                    <div className="text-caption text-muted" style={{ marginTop: 2 }}>
                      Displays digital signature image, Authorized Signatory name, and LLP authority block.
                    </div>
                  </div>
                </label>

                {/* Seal Size & Scale Controls (When signature is active) */}
                {formData.showSignatureOnPDF && (
                  <div
                    style={{
                      padding: '14px 16px',
                      backgroundColor: 'var(--color-surface-hover)',
                      borderRadius: 'var(--radius-button)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}
                  >
                    <div className="text-bold" style={{ fontSize: '13px', color: 'var(--color-text)' }}>
                      Authorized Signatory Stamp &amp; Seal Dimensions
                    </div>
                    <div className="form-grid-2">
                      <div>
                        <label className="form-label">Seal Box Height (px)</label>
                        <Input
                          type="number"
                          min="80"
                          max="240"
                          value={formData.signatureSealHeight}
                          onChange={(e) => handleFieldChange('signatureSealHeight', parseInt(e.target.value) || 170)}
                          placeholder="Default: 170"
                        />
                        <div className="text-caption text-muted" style={{ marginTop: 4 }}>
                          Standard: 170px (Recommended range: 120px - 200px)
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Seal Image Zoom / Scale (Multiplier)</label>
                        <Select
                          value={String(formData.signatureSealScale || '1.15')}
                          onChange={(e) => handleFieldChange('signatureSealScale', parseFloat(e.target.value) || 1.15)}
                          options={[
                            { value: '1.0', label: '1.0x (Original Image Size)' },
                            { value: '1.15', label: '1.15x (Standard Crisp)' },
                            { value: '1.25', label: '1.25x (Prominent Stamp)' },
                            { value: '1.35', label: '1.35x (Large Executive Seal)' }
                          ]}
                        />
                        <div className="text-caption text-muted" style={{ marginTop: 4 }}>
                          Controls realistic rubber stamp visual prominence
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom Legal Footer */}
                <div style={{ marginTop: 8 }}>
                  <label className="form-label">Custom Legal Footnote (Bottom of Page)</label>
                  <Input
                    value={formData.customFooterText}
                    onChange={(e) => handleFieldChange('customFooterText', e.target.value)}
                    placeholder="Legal footnote line on PDF"
                  />
                  <div className="text-caption text-muted" style={{ marginTop: 4 }}>
                    Jurisdiction and computer-generated acknowledgment footnote text.
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="flex justify-end">
            <Button variant="primary" icon={Save} type="submit">
              Save PDF Settings
            </Button>
          </div>
        </form>
      )}

      {/* =========================================================================
          TAB 3: COMPANY PROFILE & LETTERHEAD (INTEGRATED COMPANY MASTER)
          ========================================================================= */}
      {activeTab === 'company' && (
        <CompanyMaster />
      )}

      {/* =========================================================================
          TAB 4: DATA MANAGEMENT (JSON BACKUP & RESET)
          ========================================================================= */}
      {activeTab === 'data' && (
        <div className="flex-col gap-24">
          {/* Export / Backup Card */}
          <Card>
            <CardHeader>
              <div>
                <h3 className="heading-sub" style={{ fontSize: '15px' }}>Full System Backup (JSON Export)</h3>
                <p className="text-caption text-muted">
                  Create a complete local backup file containing all Customers, Products, Masters, Quotations, and Logs.
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div className="text-bold">Live System Database Summary:</div>
                  <div className="text-caption text-muted" style={{ marginTop: 2 }}>
                    • {quotations.length} Quotations • {customers.length} Customers • {products.length} Products
                  </div>
                </div>
                <Button
                  variant="primary"
                  icon={Download}
                  onClick={exportFullBackupJSON}
                >
                  Download Complete Backup (JSON)
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Import / Restore Card */}
          <Card>
            <CardHeader>
              <div>
                <h3 className="heading-sub" style={{ fontSize: '15px' }}>Restore Database from JSON Backup</h3>
                <p className="text-caption text-muted">
                  Upload a previously exported <code>pocika_backup_*.json</code> file to restore your quotations and masters.
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div className="text-bold">Select JSON Backup File:</div>
                  <div className="text-caption text-muted" style={{ marginTop: 2 }}>
                    File will be validated and previewed before overwriting data.
                  </div>
                </div>
                <div>
                  <input
                    type="file"
                    id="backup-file-input"
                    accept=".json,application/json"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                  <label htmlFor="backup-file-input" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                    <Upload size={15} style={{ marginRight: 6 }} />
                    Choose JSON File...
                  </label>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Danger Zone: Clear Application Data */}
          <Card style={{ borderColor: 'var(--color-danger)' }}>
            <CardHeader style={{ backgroundColor: '#fef2f2' }}>
              <div className="flex items-center gap-10">
                <AlertTriangle size={20} style={{ color: 'var(--color-danger)' }} />
                <div>
                  <h3 className="heading-sub" style={{ fontSize: '15px', color: 'var(--color-danger)' }}>
                    Danger Zone: Reset Application Data
                  </h3>
                  <p className="text-caption" style={{ color: '#991b1b' }}>
                    Clears all localStorage tables and restores original factory seed records.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
                <div className="text-caption text-muted" style={{ maxWidth: '60%' }}>
                  This will permanently delete all created quotations, customers, and master modifications.
                  Make sure you have downloaded a JSON backup first.
                </div>
                <Button
                  variant="danger"
                  icon={Trash2}
                  onClick={() => {
                    setResetConfirmText('');
                    setIsResetModalOpen(true);
                  }}
                >
                  Reset All Application Data
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 5: AUTHORIZED USERS (ADMIN ONLY)
          ========================================================================= */}
      {activeTab === 'users' && isAdmin && (
        <div className="flex-col gap-20">
          {/* Quick Metrics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
            <div style={{ padding: '14px 18px', background: '#ffffff', borderRadius: 8, border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div className="text-caption text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.04em' }}>Total Directory</div>
              <div className="text-bold" style={{ fontSize: 24, marginTop: 4, color: 'var(--color-primary)' }}>{usersList.length} Accounts</div>
              <div className="text-caption text-muted" style={{ marginTop: 2 }}>{usersList.filter(u => u.role === 'admin').length} Admins • {usersList.filter(u => u.role !== 'admin').length} Staff Members</div>
            </div>

            <div style={{ padding: '14px 18px', background: '#ffffff', borderRadius: 8, border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div className="text-caption text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.04em' }}>Staff Role Coverage</div>
              <div className="text-bold" style={{ fontSize: 24, marginTop: 4, color: '#059669' }}>
                {usersList.filter(u => u.role === 'staff' || (!u.role && !u.isSuperAdmin)).length} Active Staff
              </div>
              <div className="text-caption text-muted" style={{ marginTop: 2 }}>Authorized for Quotation Generation</div>
            </div>

            <div style={{ padding: '14px 18px', background: '#ffffff', borderRadius: 8, border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div className="text-caption text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.04em' }}>Live Quotation Register</div>
              <div style={{ marginTop: 6 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ExternalLink}
                  onClick={() => navigate('/quotations')}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Open Quotation Register
                </Button>
              </div>
              <div className="text-caption text-muted" style={{ marginTop: 4, textAlign: 'center', fontSize: 11 }}>
                Track entire firm output in real-time
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 className="heading-sub" style={{ fontSize: '16px' }}>
                    Authorized User &amp; Staff Directory
                  </h3>
                  <p className="text-caption text-muted">
                    Full control and activity tracking over administrators and quotation staff members.
                  </p>
                </div>
                <div className="flex items-center gap-8">
                  {/* Role filter buttons */}
                  <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: 6, gap: 2 }}>
                    {['ALL', 'STAFF', 'ADMIN'].map((rf) => (
                      <button
                        key={rf}
                        type="button"
                        onClick={() => setUserFilterRole(rf)}
                        style={{
                          border: 'none',
                          background: userFilterRole === rf ? '#ffffff' : 'transparent',
                          color: userFilterRole === rf ? 'var(--color-primary)' : '#64748b',
                          fontWeight: userFilterRole === rf ? 600 : 500,
                          padding: '4px 12px',
                          borderRadius: 5,
                          fontSize: 12,
                          cursor: 'pointer',
                          boxShadow: userFilterRole === rf ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {rf === 'ALL' ? 'All Directory' : rf === 'STAFF' ? 'Staff Members' : 'Admins'}
                      </button>
                    ))}
                  </div>

                  <Button
                    variant="secondary"
                    icon={RefreshCw}
                    onClick={fetchUsers}
                    disabled={isUsersLoading}
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
                  >
                    Add User / Staff
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {isUsersLoading ? (
                <div style={{ textAlign: 'center', padding: '36px' }}>
                  <RefreshCw
                    size={26}
                    style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }}
                  />
                  <div className="text-caption text-muted" style={{ marginTop: 10 }}>
                    Loading authorized user accounts &amp; quotation metrics...
                  </div>
                </div>
              ) : usersList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px' }} className="text-muted text-caption">
                  No users found in directory.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '10px 14px' }}>User &amp; Email</th>
                        <th style={{ textAlign: 'left', padding: '10px 14px' }}>Role</th>
                        <th style={{ textAlign: 'center', padding: '10px 14px' }}>Quotations Created</th>
                        <th style={{ textAlign: 'right', padding: '10px 14px' }}>Gross Value</th>
                        <th style={{ textAlign: 'left', padding: '10px 14px' }}>Joined Date</th>
                        <th style={{ textAlign: 'right', padding: '10px 14px' }}>Actions &amp; Tracking</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList
                        .filter((u) => {
                          if (userFilterRole === 'ADMIN') return u.role === 'admin';
                          if (userFilterRole === 'STAFF') return u.role !== 'admin';
                          return true;
                        })
                        .map((u) => {
                          const isSelf = currentUser?.userId === (u.id || u._id);
                          const userIdentifier = u.id || u._id;
                          const quoteCount = u.quotationsCount !== undefined ? u.quotationsCount : 0;
                          const grossVal = u.totalValue !== undefined ? u.totalValue : 0;

                          return (
                            <tr key={userIdentifier} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '12px 14px' }}>
                                <div className="flex items-center gap-10">
                                  <div
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: '50%',
                                      backgroundColor: u.isSuperAdmin ? '#fee2e2' : u.role === 'admin' ? '#e0e7ff' : '#ecfdf5',
                                      color: u.isSuperAdmin ? '#dc2626' : u.role === 'admin' ? '#4338ca' : '#047857',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 700,
                                      fontSize: 13,
                                      flexShrink: 0
                                    }}
                                  >
                                    {u.name ? u.name[0].toUpperCase() : u.email ? u.email[0].toUpperCase() : 'U'}
                                  </div>
                                  <div>
                                    <div className="text-bold flex items-center gap-6" style={{ fontSize: '13px' }}>
                                      <span>{u.name || (u.isSuperAdmin ? 'Master Super Admin' : 'Pocika Staff')}</span>
                                      {isSelf && (
                                        <span
                                          style={{
                                            fontSize: 10,
                                            backgroundColor: '#e2e8f0',
                                            padding: '1px 5px',
                                            borderRadius: 4,
                                            color: '#334155',
                                            fontWeight: 600
                                          }}
                                        >
                                          YOU
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-caption text-muted">{u.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <Badge variant={u.role === 'admin' ? 'primary' : 'neutral'}>
                                  {u.role ? u.role.toUpperCase() : 'STAFF'}
                                </Badge>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Direct filter in Quotation Register
                                    navigate(`/quotations?staff=${encodeURIComponent(userIdentifier)}`);
                                  }}
                                  style={{
                                    border: 'none',
                                    background: quoteCount > 0 ? '#f0fdf4' : '#f8fafc',
                                    color: quoteCount > 0 ? '#15803d' : '#64748b',
                                    padding: '3px 9px',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5
                                  }}
                                  title={`Filter Quotation Register for ${u.name || u.email}`}
                                >
                                  <span>{quoteCount} Quotes</span>
                                  <ExternalLink size={11} />
                                </button>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                                {formatCurrency(grossVal)}
                              </td>
                              <td style={{ padding: '12px 14px' }} className="text-caption text-muted">
                                {u.createdAt ? formatDisplayDate(u.createdAt) : 'N/A'}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                <div className="flex items-center justify-end gap-6">
                                  {/* Track staff work detail modal */}
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={Eye}
                                    onClick={() => handleViewUserWork(u)}
                                    title="View staff detailed dossier & activity"
                                  >
                                    Track Work
                                  </Button>

                                  {!u.isSuperAdmin && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleUserRole(u)}
                                        title={`Switch role to ${u.role === 'admin' ? 'staff' : 'admin'}`}
                                      >
                                        Set as {u.role === 'admin' ? 'Staff' : 'Admin'}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        icon={Trash2}
                                        style={{ color: 'var(--color-danger)' }}
                                        onClick={() => handleDeleteUser(u)}
                                        title="Delete user account"
                                      />
                                    </>
                                  )}
                                  {u.isSuperAdmin && (
                                    <span
                                      className="text-caption text-muted"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 3,
                                        color: '#94a3b8',
                                        fontSize: 11
                                      }}
                                    >
                                      <Lock size={12} /> Root
                                    </span>
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
            </CardBody>
          </Card>
        </div>
      )}

      {/* =========================================================================
          MODAL: USER WORK DOSSIER & ACTIVITY TRACKING (ADMIN ONLY)
          ========================================================================= */}
      {isUserWorkModalOpen && (
        <Modal
          isOpen={isUserWorkModalOpen}
          onClose={() => setIsUserWorkModalOpen(false)}
          title={
            <div className="flex items-center gap-8">
              <Activity size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Staff Activity &amp; Quotation Dossier</span>
            </div>
          }
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="text-caption text-muted">
                {selectedUserWork?.user ? `${selectedUserWork.user.name || selectedUserWork.user.email} (${(selectedUserWork.user.role || 'staff').toUpperCase()})` : ''}
              </div>
              <div className="flex items-center gap-8">
                {selectedUserWork?.user && (
                  <Button
                    variant="secondary"
                    icon={ExternalLink}
                    onClick={() => {
                      setIsUserWorkModalOpen(false);
                      navigate(`/quotations?staff=${encodeURIComponent(selectedUserWork.user.id || selectedUserWork.user._id)}`);
                    }}
                  >
                    Open in Quotation Register
                  </Button>
                )}
                <Button variant="primary" onClick={() => setIsUserWorkModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          {isLoadingUserWork ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
              <div className="text-caption text-muted" style={{ marginTop: 8 }}>
                Fetching quotation logs and activity trail...
              </div>
            </div>
          ) : !selectedUserWork ? (
            <div className="text-caption text-muted" style={{ padding: '24px', textAlign: 'center' }}>
              Unable to load user information.
            </div>
          ) : (
            <div className="flex-col gap-16">
              {/* Header Profile card */}
              <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div className="flex items-center gap-12">
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 16
                    }}
                  >
                    {selectedUserWork.user.name ? selectedUserWork.user.name[0].toUpperCase() : selectedUserWork.user.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-bold" style={{ fontSize: 15 }}>
                      {selectedUserWork.user.name || 'Staff User'}
                    </div>
                    <div className="text-caption text-muted">{selectedUserWork.user.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-12">
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-caption text-muted" style={{ fontSize: 11, fontWeight: 600 }}>TOTAL QUOTATIONS</div>
                    <div className="text-bold" style={{ fontSize: 16, color: 'var(--color-primary)' }}>
                      {selectedUserWork.quotations?.length || 0}
                    </div>
                  </div>
                  <div style={{ width: 1, height: 28, background: 'var(--color-border)' }} />
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-caption text-muted" style={{ fontSize: 11, fontWeight: 600 }}>GROSS VOLUME</div>
                    <div className="text-bold" style={{ fontSize: 16, color: '#059669' }}>
                      {formatCurrency(
                        (selectedUserWork.quotations || []).reduce((acc, q) => acc + (q.grandTotal || q.grossTotal || 0), 0)
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dossier Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: 16 }}>
                <button
                  type="button"
                  onClick={() => setUserWorkTab('quotations')}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    borderBottom: userWorkTab === 'quotations' ? '2px solid var(--color-primary)' : '2px solid transparent',
                    color: userWorkTab === 'quotations' ? 'var(--color-primary)' : 'var(--color-muted)',
                    fontWeight: userWorkTab === 'quotations' ? 600 : 500,
                    padding: '8px 4px',
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  Quotations Generated ({selectedUserWork.quotations?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setUserWorkTab('activity')}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    borderBottom: userWorkTab === 'activity' ? '2px solid var(--color-primary)' : '2px solid transparent',
                    color: userWorkTab === 'activity' ? 'var(--color-primary)' : 'var(--color-muted)',
                    fontWeight: userWorkTab === 'activity' ? 600 : 500,
                    padding: '8px 4px',
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  Audit Trail &amp; Actions ({selectedUserWork.activityLogs?.length || 0})
                </button>
              </div>

              {/* Tab: Quotations */}
              {userWorkTab === 'quotations' && (
                <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                  {(!selectedUserWork.quotations || selectedUserWork.quotations.length === 0) ? (
                    <div className="text-caption text-muted" style={{ padding: '24px', textAlign: 'center' }}>
                      No quotations have been generated by this staff member yet.
                    </div>
                  ) : (
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                          <th style={{ textAlign: 'left', padding: '8px 10px' }}>Quotation #</th>
                          <th style={{ textAlign: 'left', padding: '8px 10px' }}>Customer</th>
                          <th style={{ textAlign: 'left', padding: '8px 10px' }}>Date</th>
                          <th style={{ textAlign: 'right', padding: '8px 10px' }}>Amount</th>
                          <th style={{ textAlign: 'center', padding: '8px 10px' }}>Status</th>
                          <th style={{ textAlign: 'right', padding: '8px 10px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUserWork.quotations.map((q) => (
                          <tr key={q.id || q._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--color-primary)' }}>
                              {q.quotationNumber || 'DRAFT'}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              {q.customerName || (q.customerId && q.customerId.companyName) || 'N/A'}
                            </td>
                            <td style={{ padding: '8px 10px' }} className="text-muted">
                              {q.createdAt ? formatDisplayDate(q.createdAt) : 'N/A'}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                              {formatCurrency(q.grandTotal || q.grossTotal || 0)}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <Badge variant={q.status === 'ACCEPTED' ? 'success' : q.status === 'SENT' ? 'primary' : 'neutral'}>
                                {q.status || 'DRAFT'}
                              </Badge>
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsUserWorkModalOpen(false);
                                  navigate(`/quotations/view/${q.id || q._id}`);
                                }}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  color: 'var(--color-primary)',
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                  fontSize: 11,
                                  fontWeight: 600
                                }}
                              >
                                View Doc
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab: Activity Logs */}
              {userWorkTab === 'activity' && (
                <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                  {(!selectedUserWork.activityLogs || selectedUserWork.activityLogs.length === 0) ? (
                    <div className="text-caption text-muted" style={{ padding: '24px', textAlign: 'center' }}>
                      No recent activity logs recorded for this account.
                    </div>
                  ) : (
                    <div className="flex-col gap-10">
                      {selectedUserWork.activityLogs.map((log, idx) => (
                        <div
                          key={log.id || log._id || idx}
                          style={{
                            padding: '10px 14px',
                            background: '#f8fafc',
                            borderRadius: 6,
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: 12
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{log.action || 'Event'}</span>
                            <span style={{ marginLeft: 8, color: 'var(--color-muted)' }}>
                              {log.details || log.description || log.entityType || ''}
                            </span>
                          </div>
                          <div className="text-caption text-muted" style={{ fontSize: 11 }}>
                            {log.createdAt ? formatDisplayDate(log.createdAt) : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* =========================================================================
          MODAL: ADD NEW USER (ADMIN ONLY)
          ========================================================================= */}
      {isAddUserModalOpen && (
        <Modal
          isOpen={isAddUserModalOpen}
          onClose={() => {
            setUserModalError('');
            setIsAddUserModalOpen(false);
          }}
          title="Create New Authorized User"
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
            {/* Inline Error Alert if validation or server returned error */}
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

            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--color-surface-hover)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px'
              }}
            >
              <div className="text-bold" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} style={{ color: 'var(--color-primary)' }} />
                Account Security Notice
              </div>
              <div className="text-caption text-muted" style={{ marginTop: 4 }}>
                New accounts are provisioned with standard permissions and are never super-admins. Only authorized individuals should receive credentials.
              </div>
            </div>

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
              {newUserData.password && newUserData.password.length < 6 && (
                <div className="text-caption" style={{ color: 'var(--color-danger)', marginTop: 4 }}>
                  Password must be at least 6 characters ({newUserData.password.length}/6 entered).
                </div>
              )}
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
                  { value: 'staff', label: 'Staff (Create/edit quotations, view masters)' },
                  { value: 'admin', label: 'Admin (Full system settings, user management, backups)' }
                ]}
                hint="Staff accounts cannot alter system settings, manage users, or delete masters."
              />
            </div>
          </form>
        </Modal>
      )}

      {/* =========================================================================
          MODAL 1: BACKUP IMPORT PREVIEW & CONFIRMATION
          ========================================================================= */}
      {isImportModalOpen && importPreview && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title="Confirm Backup Restoration"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-8 w-full">
              <Button variant="secondary" onClick={() => setIsImportModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" icon={CheckCircle2} onClick={handleConfirmImport}>
                Confirm &amp; Restore Data
              </Button>
            </div>
          }
        >
          <div className="flex-col gap-16">
            <div className="text-caption">
              The backup file was validated successfully. The following data records will be restored:
            </div>

            <div
              style={{
                padding: '14px',
                backgroundColor: 'var(--color-surface-hover)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-button)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                fontSize: '13px'
              }}
            >
              <div><strong>Quotations:</strong> {importPreview.quotations} records</div>
              <div><strong>Customers:</strong> {importPreview.customers} records</div>
              <div><strong>Products:</strong> {importPreview.products} records</div>
              <div><strong>Categories:</strong> {importPreview.categories} records</div>
              <div><strong>Tax Rates:</strong> {importPreview.taxes} records</div>
              <div><strong>Payment Terms:</strong> {importPreview.paymentTerms} records</div>
            </div>

            <div className="text-caption text-muted" style={{ color: 'var(--color-warning)' }}>
              Note: Existing tables in your browser will be replaced with the contents of this backup file.
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          MODAL 2: DANGER RESET EXPLICIT CONFIRMATION
          ========================================================================= */}
      {isResetModalOpen && (
        <Modal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          title="Permanently Reset Application Data?"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-8 w-full">
              <Button variant="secondary" onClick={() => setIsResetModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                icon={Trash2}
                disabled={resetConfirmText.trim().toUpperCase() !== 'DELETE'}
                onClick={handleConfirmReset}
              >
                Erase &amp; Reset System
              </Button>
            </div>
          }
        >
          <div className="flex-col gap-16">
            <div className="flex items-center gap-10" style={{ color: 'var(--color-danger)' }}>
              <AlertTriangle size={24} />
              <div className="text-bold" style={{ fontSize: '14px' }}>
                This destructive action cannot be undone!
              </div>
            </div>

            <div className="text-caption text-muted">
              All quotation registers, customized products, and new customer profiles will be deleted from this browser.
            </div>

            <div>
              <label className="form-label required">
                Type <strong>DELETE</strong> in capital letters to confirm:
              </label>
              <Input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="Type DELETE"
                autoFocus
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
