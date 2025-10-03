const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const {verifySession, redirectIfAuthenticated,verifyRecaptcha} = require('../middleware/authMiddleware');
const {validateRegistration, validateLogin} = require('../middleware/validationMiddleware');
const passportGoogle = require("../config/ggauth");

const router = express.Router();

// GET /register - Render registration page
router.get('/register', redirectIfAuthenticated, authController.getRegister);

// POST /register - Register new user with reCAPTCHA
router.post('/register', redirectIfAuthenticated, verifyRecaptcha, validateRegistration, authController.register);

// GET /login - Render login page
router.get('/login', redirectIfAuthenticated, authController.getLogin);

// POST /login - Login user
router.post('/login', redirectIfAuthenticated, validateLogin, authController.login);

// POST /logout - Logout user
router.post('/logout', authController.logout);

// GET /ban - Render banned notification page
router.get('/ban', (req, res) => res.render('auth/banotifcation'));
// GET /logout - Allow logout via link *
router.get('/logout', authController.logout);

// GET /forgot-password - Render forgot password page
router.get('/forgot-password', redirectIfAuthenticated, (req, res) => {
  res.render('auth/forgot-password', { error: null });
});

// Google OAuth
router.get(
  "/google",
  passportGoogle.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passportGoogle.authenticate("google", { failureRedirect: "/auth/login" }),
  async (req, res) => {
    // Set session 
    req.session.userId = req.user._id;
    req.session.userRole = req.user.role;
    
    // Set user session for navbar display
    req.session.user = {
      id: req.user._id,
      name: req.user.profileInfo?.firstName + ' ' + (req.user.profileInfo?.lastName || ''),
      role: req.user.role,
      theme: req.user.theme || 'light',
      profilePicture: req.user.profileInfo?.profilePhoto || null
    };

    // Banned takes priority
    if (req.user.isLocked) {
      return res.redirect('/auth/login?error=' + encodeURIComponent('Your account has been banned. Contact support.'));
    }
    // Force deactivated, non-admin users to reactivate page
    if (!req.user.isActive && req.user.role !== 'admin') {
      return res.redirect('/auth/reactivate');
    }
    
    if (!req.user.password) {
      return res.redirect("/auth/set-password");
    }
    
    // Generate signup token if not exists
    if (!req.user.signupToken) {
      const crypto = require("crypto");
      const { User } = require("../models/userSchema");

      await User.findByIdAndUpdate(req.user._id, {
        signupToken: crypto.randomBytes(24).toString("hex"),
        signupTokenCreatedAt: new Date(),
        signupTokenRevealed: false,
      });
      
      // Refresh user data
      const updatedUser = await User.findById(req.user._id);
      req.user = updatedUser;
    }
    
    // Redirect based on whether user needs to see token
    if (!req.user.signupTokenRevealed && req.user.signupToken) {
      return res.redirect("/auth/token");
    } else {
      return res.redirect("/");
    }
  }
);

// Settings routes
router.get("/settings", verifySession, authController.getSettings);
router.put("/settings/password", verifySession, authController.updatePassword);
router.put("/settings/theme", verifySession, userController.updateTheme);

// Set password for Google OAuth users
router.get("/set-password", verifySession, authController.getSetPassword);
router.post("/set-password", verifySession, authController.setPassword);

// Account management
// Block deactivation for admins at service layer; route remains for users
router.post("/settings/deactivate", verifySession, authController.deactivateAccount);

// Token management
router.get("/token", verifySession, authController.getToken);
router.post("/token/viewed", verifySession, authController.markTokenViewed);

// Reactivation routes (force for deactivated users)
router.get('/reactivate', verifySession, authController.getReactivate);
router.post('/reactivate', verifySession, authController.reactivateAccount);

// Password reset using signup token
router.post("/reset-password/:token", authController.resetPassword);

module.exports = router;