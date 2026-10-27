import jwt from 'jsonwebtoken';

// Verifies the JWT from the Authorization header and populates req.user
export function authenticate(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query?.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Missing Bearer token.'
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      success: false,
      error: 'Server authentication configuration error.'
    });
  }

  const effectiveSecret = secret || 'pocika_default_jwt_secret_dev';

  try {
    const decoded = jwt.verify(token, effectiveSecret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Authentication token has expired. Please login again.'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token.'
    });
  }
}

export const auth = authenticate;
export default authenticate;
