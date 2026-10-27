import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  KeyRound,
  Save,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Input } from '../common/Input';

/**
 * Dedicated Profile Drawer
 * Strictly dedicated to the logged-in User's Account info, role, and password change.
 * All company, system, user management, and backup settings reside in /settings.
 */
export function ProfileDrawer({ isOpen, onClose }) {
  const { user: currentUser, logout, isAdmin } = useAuth();
  const { success, error } = useToast();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      error('Current Password Required', 'Please enter your current account password.');
      return;
    }
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      error('Invalid New Password', 'New password must be at least 6 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      error('Password Mismatch', 'New password and confirmation password do not match.');
      return;
    }

    try {
      setIsChangingPassword(true);
      await api.auth.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      success('Password Updated', 'Your password has been changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      error('Password Update Failed', err.message || 'Could not change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!isOpen) return null;

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : currentUser?.email?.slice(0, 2).toUpperCase() || 'AD';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100%',
          backgroundColor: 'var(--color-surface, #ffffff)',
          borderLeft: '1px solid var(--color-border, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 28px rgba(0, 0, 0, 0.28)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-surface-hover, #f8fafc)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary, #b3261e)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '15px'
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text, #0f172a)' }}>
                  {currentUser?.name || 'User Profile'}
                </span>
                <Badge variant={isAdmin ? 'danger' : 'neutral'}>
                  {currentUser?.role?.toUpperCase() || 'STAFF'}
                </Badge>
                {currentUser?.isSuperAdmin && (
                  <Badge variant="primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <ShieldCheck size={12} /> SUPER-ADMIN
                  </Badge>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #64748b)', marginTop: 2 }}>
                {currentUser?.email}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted, #64748b)',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Title Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--color-border, #e2e8f0)',
            backgroundColor: 'var(--color-surface, #ffffff)',
            padding: '0 16px'
          }}
        >
          <div
            style={{
              padding: '12px 0',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--color-primary, #b3261e)',
              borderBottom: '2px solid var(--color-primary, #b3261e)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <User size={15} /> My User Profile
          </div>

          <button
            type="button"
            onClick={logout}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-danger, #ef4444)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 10px',
              borderRadius: '6px'
            }}
            title="Sign out of account"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>

        {/* Drawer Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {/* Account Details Card */}
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-surface-hover, #f8fafc)',
              border: '1px solid var(--color-border, #e2e8f0)'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: 12 }}>Account Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Full Name</span>
                <div style={{ fontWeight: 600, fontSize: '13px', marginTop: 2 }}>{currentUser?.name || '-'}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Email Address</span>
                <div style={{ fontWeight: 600, fontSize: '13px', marginTop: 2 }}>{currentUser?.email}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Role Access</span>
                <div style={{ marginTop: 2 }}>
                  <Badge variant={isAdmin ? 'danger' : 'neutral'}>{currentUser?.role?.toUpperCase()}</Badge>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Account Tier</span>
                <div style={{ marginTop: 2 }}>
                  {currentUser?.isSuperAdmin ? (
                    <Badge variant="primary">Super-Admin (Protected)</Badge>
                  ) : (
                    <Badge variant="neutral">Authorized Staff User</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Password Change Form */}
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid var(--color-border, #e2e8f0)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <KeyRound size={18} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Change Account Password</span>
            </div>
            <form onSubmit={handlePasswordSubmit} className="flex-col gap-14">
              <Input
                label="Current Password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="Enter current password"
                required
              />
              <Input
                label="New Password (min 6 chars)"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Enter new password"
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Repeat new password"
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <Button variant="primary" type="submit" loading={isChangingPassword} icon={Save}>
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Drawer Footer with Sign Out */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--color-border, #e2e8f0)',
            backgroundColor: 'var(--color-surface-hover, #f8fafc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Logged in as <strong>{currentUser?.email}</strong>
          </span>
          <Button
            variant="ghost"
            icon={LogOut}
            onClick={() => {
              onClose();
              logout();
            }}
            style={{ color: 'var(--color-danger)' }}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
