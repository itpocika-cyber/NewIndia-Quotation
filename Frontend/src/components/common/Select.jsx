import React from 'react';

/**
 * Reusable Select Dropdown Component
 */
export function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder,
  required = false,
  error = '',
  hint = '',
  disabled = false,
  className = '',
  valueKey = 'value',
  labelKey = 'label',
  children,
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

      <select
        id={name}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        className={`form-select ${isError ? 'input-error' : ''}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children
          ? children
          : options.map((opt, idx) => {
              const optValue = typeof opt === 'object' ? opt[valueKey] : opt;
              const optLabel = typeof opt === 'object' ? opt[labelKey] : opt;
              return (
                <option key={idx} value={optValue}>
                  {optLabel}
                </option>
              );
            })}
      </select>

      {error ? (
        <span className="form-error">{error}</span>
      ) : hint ? (
        <span className="form-hint">{hint}</span>
      ) : null}
    </div>
  );
}
