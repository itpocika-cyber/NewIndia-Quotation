import React from 'react';

/**
 * Reusable Status/Tag Badge
 * Variants: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary'
 */
export function Badge({
  children,
  variant = 'neutral',
  icon: Icon,
  className = '',
  ...props
}) {
  return (
    <span className={`badge badge-${variant} ${className}`.trim()} {...props}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}
