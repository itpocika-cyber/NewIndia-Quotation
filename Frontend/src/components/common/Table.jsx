import React from 'react';

/**
 * Reusable Horizontally-Scrollable Responsive Table Component
 */
export function Table({ children, className = '', containerClassName = '', containerStyle = {}, ...props }) {
  return (
    <div className={`table-container ${containerClassName}`.trim()} style={containerStyle}>
      <table className={`table ${className}`.trim()} {...props}>
        {children}
      </table>
    </div>
  );
}
