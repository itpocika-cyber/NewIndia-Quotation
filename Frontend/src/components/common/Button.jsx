import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Reusable Button Component
 * Variants: 'primary' | 'secondary' | 'ghost' | 'danger'
 * Sizes: 'sm' | 'md' | 'lg'
 */
export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  type = 'button',
  icon: Icon,
  disabled = false,
  isLoading = false,
  className = '',
  onClick,
  ...props
}) {
  const isIconOnly = Boolean(Icon && !children);
  const variantClass = `btn-${variant}`;
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const iconOnlyClass = isIconOnly ? 'btn-icon-only' : '';
  const loadingClass = isLoading ? 'btn-loading' : '';

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`btn ${variantClass} ${sizeClass} ${iconOnlyClass} ${loadingClass} ${className}`.trim()}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={size === 'sm' ? 15 : size === 'lg' ? 18 : 16} />
      ) : (
        Icon && <Icon size={size === 'sm' ? 15 : size === 'lg' ? 18 : 16} />
      )}
      {children}
    </button>
  );
}
