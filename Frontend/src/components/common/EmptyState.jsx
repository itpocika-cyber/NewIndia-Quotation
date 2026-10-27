import React from 'react';
import { Button } from './Button';

/**
 * Reusable Empty State component with icon, title, description, and action button
 */
export function EmptyState({
  icon: Icon,
  title = 'No items found',
  description = 'Get started by creating your first entry.',
  actionLabel,
  onAction,
  className = ''
}) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      {Icon && (
        <div className="empty-icon">
          <Icon size={24} />
        </div>
      )}
      <div className="empty-title">{title}</div>
      {description && <div className="empty-description">{description}</div>}
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
