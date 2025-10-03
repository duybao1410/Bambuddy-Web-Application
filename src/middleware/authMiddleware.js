// src/middleware/authMiddleware.js
const { User } = require('../models/userSchema');
const axios = require('axios');
const path = require('path');

/**
 * MIDDLEWARE 1: VERIFY SESSION - Kiểm tra đã login chưa
 * Dùng cho: Profile, booking, forum posts, change password
 * Logic: Check session → Get user → Validate user → Attach to req.user
 */
const verifySession = async (req, res, next) => {
    try {
        // Check if user is logged in (có session userId)
        if (!req.session || !req.session.userId) {
            // debug removed
            
            // For AJAX requests, return JSON instead of redirect
            if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.headers['x-requested-with'] === 'XMLHttpRequest') {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }
            
            return res.redirect('/auth/login');             
        }
        

        // Get user from database
        const user = await User.findById(req.session.userId).select('-password');

        if (!user) {
            // Clear invalid session
            req.session.destroy();
            return res.status(401).json({
                success: false,
                error: 'Invalid session - user not found'
            });
        }

        // Do NOT block deactivated users here; allow session so they can reach /auth/reactivate

        if (user.isLocked) {
            // If user is trying to access auth pages, just render the banned page
            if (req.path && req.path.startsWith('/auth')) {
                return res.redirect('/auth/ban');
            }
            req.session.destroy(() => {
                res.clearCookie('connect.sid');
                return res.redirect('/auth/ban');
            });
            return;
        }

        // Add user to request object and expose to views
        req.user = user;
        res.locals.user = {
            ...res.locals.user,
            email: user.email,
            role: user.role,
            theme: user.theme || 'light',
            profileInfo: user.profileInfo
        };
        next();
    } catch (error) {
        console.error('Session verification error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication error'
        });
    }
};

/**
 * MIDDLEWARE 2: VERIFY TOUR GUIDE - Chỉ tourguide mới được
 * Dùng cho: Create tour, update tour, delete tour
 * Logic: Verify session first → Check role = 'tourguide'
 */
const verifyTourGuide = async (req, res, next) => {
    try {
        // First verify session
        await verifySession(req, res, () => {
            // Check if user role is tourguide
            if (req.user.role !== 'tourguide') {
        return res.status(403).sendFile(path.join(__dirname, '../../public/html/error-authentication.html'));
                //res.status(403).json({ success: false, error: 'Only tour guides can perform this action'
            }
            // If everything is OK, continue
            next();
        });
    } catch (error) {
        console.error('Tour guide verification error:', error);
        return res.status(401).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

// MIDDLEWARE 3: VERIFY USER 

const verifyUser= async (req, res, next) => {
    try {
        // First verify session
        await verifySession(req, res, () => {
            // Check if user role is tourguide
            if (req.user.role !== 'user') {
           return res.status(403).sendFile(path.join(__dirname, '../../public/html/error-authentication.html'));
                //res.status(403).json({ success: false, error: 'Only tour guides can perform this action'
            }
            // If everything is OK, continue
            next();
        });
    } catch (error) {
        console.error('User verification error:', error);
        return res.status(401).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

const verifyUserBooking = async (req, res, next) => {  // = verifyUser nhưng lỡ làm cho redirect về tourDetail
    try {
        // First verify session
        await verifySession(req, res, () => {
            // Check if user role is user
            if (req.user.role !== 'user') {
                  const tourID = req.params.tourID;
                 error = new Error('Only user can perform this action');
                return res.redirect(`/tourDetail/${tourID}?error=${encodeURIComponent(error.message)}`);
            }
            // If everything is OK, continue
            next();
        });
    } catch (error) {
        console.error('User verification error:', error);
        return res.status(401).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

/**
 * MIDDLEWARE 4: BLOCK ADMIN FROM USER/GUIDE FEATURES
 * Prevents admin from accessing profile editing, booking management, etc.
 */
const blockAdminFromUserFeatures = async (req, res, next) => {
    try {
        // First verify session
        await verifySession(req, res, () => {
            // Block admin from accessing user/guide specific features
            if (req.user.role === 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Admins cannot access this feature'
                });
            }
            // If not admin, continue
            next();
        });
    } catch (error) {
        console.error('Admin block verification error:', error);
        return res.status(401).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};


/**
 * MIDDLEWARE 3: REDIRECT IF AUTHENTICATED - Chặn đã login
 * Dùng cho: Login page, register page
 * Logic: Nếu đã login rồi thì không cho vào trang login/register
 */
const redirectIfAuthenticated = async (req, res, next) => {
    try {
        // Allow forced access to auth pages by clearing session when force is present
        if (req.query && typeof req.query.force !== 'undefined' && req.session) {
            return req.session.destroy(() => {
                // Proactively clear cookie as well
                if (res && typeof res.clearCookie === 'function') {
                    res.clearCookie('connect.sid');
                }
                next();
            });
        }

        if (req.session && req.session.userId) {
            // Validate the session actually maps to a real user
            const user = await User.findById(req.session.userId).select('_id');
            if (!user) {
                // Stale cookie/session — clear and allow auth page
                req.session.destroy(() => next());
                return;
            }
            // Valid session → redirect away from auth pages
            if (req.method === 'GET') {
                return res.redirect('/');
            }
            return res.status(400).json({ success: false, message: 'Already logged in' });
        }
        next();
    } catch (e) {
        // On error, allow access to auth pages
        next();
    }
};

const verifyRecaptcha = async (req, res, next) => {
  const token = req.body['g-recaptcha-response'];
  if (!token) {
    return res.status(400).json({ success: false, message: 'Missing reCAPTCHA token' });
  }


  try {
    const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: {
        secret: process.env.reCAPTCHA_secret_key,
        response: token,
      },
    });


    const data = response.data;


    if (!data.success || data.score < 0.5) {
      return res.status(403).json({ success: false, message: 'reCAPTCHA verification failed' });
    }


    // Passed reCAPTCHA check
    next();
  } catch (err) {
    console.error('reCAPTCHA Error:', err);
    return res.status(500).json({ success: false, message: 'Error verifying reCAPTCHA' });
  }
};



module.exports = {
    // Core middlewares
    verifySession,           // Bắt buộc login (bất kỳ role nào)
    verifyTourGuide,         // Chỉ tourguide
    verifyUserBooking,              // Chỉ user in booking
    verifyUser,               // Chỉ user
    blockAdminFromUserFeatures, // Block admin from user/guide features
    redirectIfAuthenticated, // Block đã login
     verifyRecaptcha,         // Verify reCAPTCHA token
    verifyActiveUser: (req, res, next) => {
        if (req.user && req.user.role !== 'admin' && !req.user.isActive) {
            // For AJAX requests, return JSON instead of redirect
            if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.headers['x-requested-with'] === 'XMLHttpRequest') {
                return res.status(403).json({
                    success: false,
                    error: 'Account deactivated. Please reactivate your account.'
                });
            }
            return res.redirect('/auth/reactivate');
        }
        return next();
    }
};