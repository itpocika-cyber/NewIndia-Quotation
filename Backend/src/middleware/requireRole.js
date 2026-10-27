// Role-based authorization middleware
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Action requires one of the following roles: [${allowedRoles.join(', ')}]. Your current role is '${req.user.role}'.`
      });
    }

    next();
  };
}

export default requireRole;
