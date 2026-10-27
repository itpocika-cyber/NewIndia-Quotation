export function errorHandler(err, req, res, next) {
  console.error('Unhandled Application Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: messages.join(', ')
    });
  }

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyPattern || {})[0] || 'record';
    return res.status(409).json({
      success: false,
      error: `A ${duplicateField} with this value already exists.`
    });
  }

  // CastError (invalid ObjectId or value type)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Invalid resource identifier: ${err.value}`
    });
  }

  // Generic fallback
  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  let errorMessage = err.message || 'Internal server error occurred.';
  if (statusCode === 500 && isProd) {
    errorMessage = 'An unexpected server error occurred. Please contact system administrator.';
  }

  res.status(statusCode).json({
    success: false,
    error: errorMessage
  });
}
