import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Menu,
  User,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileDrawer } from '../profile/ProfileDrawer';

const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard', group: 'Overview' },
  '/quotations': { title: 'Quotation Register', group: 'Transactions' },
  '/quotations/create': { title: 'Create Quotation', group: 'Transactions' },
  '/reports': { title: 'Reports & Analytics', group: 'Analytics' },
  '/activity': { title: 'Activity Log', group: 'Analytics' },
  '/masters/customers': { title: 'Customer Directory', group: 'Masters' },
  '/masters/products': { title: 'Product Master', group: 'Masters' },
  '/masters/categories': { title: 'Category Master', group: 'Masters' },
  '/masters/units': { title: 'Unit Master', group: 'Masters' },
  '/masters/taxes': { title: 'Tax / GST Master', group: 'Masters' },
  '/masters/payment-terms': { title: 'Payment Terms Master', group: 'Masters' },
  '/masters/terms-conditions': { title: 'Terms & Conditions Master', group: 'Masters' },
  '/settings': { title: 'System & Company Administration', group: 'Administration' }
};

/**
 * Top Header with single Profile button per §15 (Profile-centric admin UI)
 */
export function Header({ onToggleSidebar }) {
  const location = useLocation();
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const pageInfo = PAGE_TITLES[location.pathname] || { title: 'Quotation System', group: 'App' };

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email ? user.email.slice(0, 2).toUpperCase() : 'AD';

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Administrator');
  const userRole = (user?.role || 'admin').toUpperCase();
  const isAdmin = user?.role === 'admin' || user?.isSuperAdmin;

  return (
    <>
      <header className="top-header">
        <div className="header-left">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation drawer"
          >
            <Menu size={20} />
          </button>

          <div className="breadcrumb-area">
            <div className="breadcrumb">
              <span>{pageInfo.group}</span>
              <span>/</span>
              <span>{pageInfo.title}</span>
            </div>
            <h1 className="page-title">{pageInfo.title}</h1>
          </div>
        </div>

        <div className="header-right" style={{ display: 'flex', alignItems: 'center' }}>
          {/* Single Consolidated "Profile" Button (§15) */}
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            aria-label="Open Profile and Administration Drawer"
            title="Open Profile & Settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '5px 12px 5px 6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-border, #E2E8F0)',
              borderRadius: '24px',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary, #B3261E)';
              e.currentTarget.style.backgroundColor = 'var(--color-surface-hover, #F8FAFC)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border, #E2E8F0)';
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            {/* Avatar Pill */}
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: isAdmin
                  ? 'linear-gradient(135deg, #B3261E 0%, #8B1A13 100%)'
                  : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11.5px',
                fontWeight: 700,
                letterSpacing: '0.3px',
                flexShrink: 0
              }}
            >
              {userInitials}
            </div>

            {/* User Name & Profile Badge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', lineHeight: 1.15 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: 'var(--color-text, #0F172A)',
                    maxWidth: '120px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {displayName}
                </span>
                {user?.isSuperAdmin && (
                  <ShieldCheck size={13} style={{ color: 'var(--color-primary, #B3261E)' }} title="Super-Admin" />
                )}
              </div>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  color: isAdmin ? '#B3261E' : '#2563EB',
                  letterSpacing: '0.4px'
                }}
              >
                PROFILE ({userRole})
              </span>
            </div>
          </button>
        </div>
      </header>

      {/* Profile-Centric Executive Administration Drawer (§15) */}
      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
}
export default Header;
