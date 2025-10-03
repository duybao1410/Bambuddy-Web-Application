const { User } = require('../models/userSchema');

/**
 * Middleware to inject user notifications into res.locals for EJS templates
 * This makes notifications available in all views without having to pass them manually
 */
const injectNotifications = async (req, res, next) => {
  try {
    // Only inject notifications if user is logged in
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId)
        .select('notifications')
        .lean();
      
      if (user && user.notifications) {
        // Get unread notifications count
        const unreadCount = user.notifications.filter(n => !n.read).length;
        
        // Get recent notifications (last 10)
        const recentNotifications = user.notifications
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10);
        
        // Inject into res.locals for EJS templates
        res.locals.notifications = {
          all: user.notifications,
          recent: recentNotifications,
          unreadCount: unreadCount
        };
      } else {
        res.locals.notifications = {
          all: [],
          recent: [],
          unreadCount: 0
        };
      }
    } else {
      res.locals.notifications = {
        all: [],
        recent: [],
        unreadCount: 0
      };
    }
    
    next();
  } catch (error) {
    console.error('Error injecting notifications:', error);
    // Don't fail the request if notifications fail
    res.locals.notifications = {
      all: [],
      recent: [],
      unreadCount: 0
    };
    next();
  }
};

module.exports = {
  injectNotifications
};

