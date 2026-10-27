import React from 'react';

/**
 * Reusable Card Surface Component
 */
export function Card({ children, className = '', ...props }) {
  return (
    <div className={`card ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, actions, children, className = '' }) {
  return (
    <div className={`card-header ${className}`.trim()}>
      <div>
        {title && <h3 className="card-title">{title}</h3>}
        {description && <p className="card-description">{description}</p>}
        {children}
      </div>
      {actions && <div className="card-actions flex items-center gap-8">{actions}</div>}
    </div>
  );
}

export function CardBody({ children, className = '', ...props }) {
  return (
    <div className={`card-body ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`card-footer ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
