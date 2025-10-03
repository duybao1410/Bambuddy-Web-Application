const { verifySession } = require('./authMiddleware');

/* Verify admin access (Requires user to be authenticated and have admin role) */
const verifyAdmin = async (req, res, next) => {
  try {
    // First verify session and attach user
    await new Promise((resolve, reject) => {
      verifySession(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check if user has admin role
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Check if admin account is active
    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is deactivated.'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }
};

module.exports = {
  verifyAdmin
};


