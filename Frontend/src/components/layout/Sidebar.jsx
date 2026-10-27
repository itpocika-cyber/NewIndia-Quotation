import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  Users,
  Package,
  FolderTree,
  Scale,
  Percent,
  CreditCard,
  FileText,
  FileSpreadsheet,
  BarChart3,
  History,
  ShieldCheck,
  Settings as SettingsIcon,
  UserCheck
} from 'lucide-react';
import { useMasters } from '../../context/MastersContext';
import { useAuth } from '../../context/AuthContext';

export function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { company } = useMasters();
  const { isAdmin } = useAuth();
  const logoSrc = company?.logoUrl || '/logo.png';

  const handleNavClick = () => {
    if (window.innerWidth <= 900 && onClose) {
      onClose();
    }
  };

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src={logoSrc}
            alt="POCIKA"
            style={{
              height: '38px',
              maxWidth: '70px',
              objectFit: 'contain'
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="brand-info">
            <span className="brand-name">POCIKA</span>
            <span className="brand-tag">Fire &amp; Safety Products llp</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Main Group */}
          <div className="nav-group">
            <div className="nav-group-title">Overview</div>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <LayoutDashboard className="nav-link-icon" />
              <span>Dashboard</span>
            </NavLink>
          </div>

          {/* Transactions */}
          <div className="nav-group">
            <div className="nav-group-title">Transactions</div>
            <NavLink
              to="/quotations/create"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <FilePlus className="nav-link-icon" />
              <span>Create Quotation</span>
            </NavLink>

            <NavLink
              to="/quotations"
              end
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <FileSpreadsheet className="nav-link-icon" />
              <span>Quotation List</span>
            </NavLink>
          </div>

          {/* Analytics & Reports (Admin Only) */}
          {isAdmin && (
            <div className="nav-group">
              <div className="nav-group-title">Analytics</div>
              <NavLink
                to="/reports"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <BarChart3 className="nav-link-icon" />
                <span>Reports</span>
              </NavLink>

              <NavLink
                to="/activity"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <History className="nav-link-icon" />
                <span>Activity Log</span>
              </NavLink>
            </div>
          )}

          {/* Customer Management (Staff & Admin) */}
          <div className="nav-group">
            <div className="nav-group-title">Directory</div>
            <NavLink
              to="/masters/customers"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <Users className="nav-link-icon" />
              <span>Customers</span>
            </NavLink>
          </div>

          {/* Masters (Admin Only - Products, Taxes, Categories, Terms) */}
          {isAdmin && (
            <div className="nav-group">
              <div className="nav-group-title">Masters</div>
              <NavLink
                to="/masters/products"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <Package className="nav-link-icon" />
                <span>Products</span>
              </NavLink>

              <NavLink
                to="/masters/categories"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <FolderTree className="nav-link-icon" />
                <span>Categories</span>
              </NavLink>

              <NavLink
                to="/masters/units"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <Scale className="nav-link-icon" />
                <span>Units</span>
              </NavLink>

              <NavLink
                to="/masters/taxes"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <Percent className="nav-link-icon" />
                <span>Tax / GST</span>
              </NavLink>

              <NavLink
                to="/masters/payment-terms"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <CreditCard className="nav-link-icon" />
                <span>Payment Terms</span>
              </NavLink>

              <NavLink
                to="/masters/terms-conditions"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <FileText className="nav-link-icon" />
                <span>Terms & Conditions</span>
              </NavLink>
            </div>
          )}

          {/* Administration & Security (Admin Only) */}
          {isAdmin && (
            <div className="nav-group">
              <div className="nav-group-title">Administration</div>
              <NavLink
                to="/users"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <UserCheck className="nav-link-icon" />
                <span>Authorized Users</span>
              </NavLink>

              <NavLink
                to="/settings"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <SettingsIcon className="nav-link-icon" />
                <span>Company Settings</span>
              </NavLink>
            </div>
          )}
        </nav>

        <div className="sidebar-footer" style={{ padding: '12px 14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '6px 10px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              border: '1px solid var(--color-border, #E2E8F0)',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
            }}
            title={`${company?.name || 'POCIKA'} (${company?.city || 'Surat'})`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img
                src={logoSrc}
                alt="Logo"
                style={{ height: '20px', width: 'auto', objectFit: 'contain' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text, #0F172A)' }}>
                {company?.name?.split(' ')[0] || 'POCIKA'} ({company?.city || 'Surat'})
              </span>
            </div>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10.5px',
                fontWeight: 600,
                color: '#16A34A',
                backgroundColor: '#DCFCE7',
                padding: '2px 7px',
                borderRadius: '12px'
              }}
              title="Cloud Database Connected & Live"
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
              v3.0
            </span>
          </div>
        </div>
      </aside>

      {isOpen && <div className="mobile-backdrop" onClick={onClose} />}
    </>
  );
}
