const ApiError = require('../utils/ApiError');

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions for this action'));
    }
    next();
  };
};

module.exports = requireRole;
