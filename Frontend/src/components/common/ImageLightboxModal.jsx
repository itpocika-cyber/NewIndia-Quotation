import React, { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

export function ImageLightboxModal({ isOpen, onClose, imageUrl, title = 'Product Image' }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '92vw',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC'
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A', maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              title="Open full size"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                color: '#475569',
                backgroundColor: '#FFFFFF',
                textDecoration: 'none'
              }}
            >
              <ExternalLink size={16} />
            </a>
            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                color: '#475569',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Image Content Container */}
        <div
          style={{
            padding: '16px',
            backgroundColor: '#FAFAFA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '280px',
            minHeight: '200px'
          }}
        >
          <img
            src={imageUrl}
            alt={title}
            style={{
              maxWidth: '85vw',
              maxHeight: '75vh',
              objectFit: 'contain',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          />
        </div>
      </div>
    </div>
  );
}
