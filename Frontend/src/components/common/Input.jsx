import React from 'react';

/**
 * Reusable Input and Textarea Component
 */
export function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  error = '',
  hint = '',
  disabled = false,
  multiline = false,
  rows = 3,
  className = '',
  icon: Icon,
  ...props
}) {
  const isError = Boolean(error);

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label className="form-label" htmlFor={name}>
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}

      {multiline ? (
        <textarea
          id={name}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={`form-textarea ${isError ? 'input-error' : ''}`}
          {...props}
        />
      ) : Icon ? (
        <div className="search-box">
          <Icon className="search-icon" size={16} />
          <input
            id={name}
            name={name}
            type={type}
            value={value ?? ''}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`form-input ${isError ? 'input-error' : ''}`}
            {...props}
          />
        </div>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`form-input ${isError ? 'input-error' : ''}`}
          {...props}
        />
      )}

      {error ? (
        <span className="form-error">{error}</span>
      ) : hint ? (
        <span className="form-hint">{hint}</span>
      ) : null}
    </div>
  );
}
