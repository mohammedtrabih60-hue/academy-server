const { err } = require('../utils/helpers');

// usage: role('director', 'admin')
module.exports = function role(...allowed) {
  return (req, res, next) => {
    if (!req.role || !allowed.includes(req.role)) {
      return err(res, 'forbidden', 'You do not have permission for this action', 403);
    }
    next();
  };
};
