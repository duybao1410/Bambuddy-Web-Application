const authService = require("../services/authService");

class AuthController {
  // GET register page
  async getRegister(req, res) {
    res.render("auth/register", { error: null });
  }

  // POST /register
  async register(req, res) {
    try {
      const result = await authService.registerUser(req.body);
      req.session.userId = result.user._id;
      req.session.userRole = result.user.role;
      
      // Set user session for navbar display
      req.session.user = {
        id: result.user._id,
        name: `${result.user.profileInfo?.firstName || ''} ${result.user.profileInfo?.lastName || ''}`.trim(),
        role: result.user.role,
        theme: result.user.theme || 'light',
        profilePicture: (result.user.profileInfo?.profilePhoto && result.user.profileInfo.profilePhoto !== 'defaultAvatar.png')
          ? result.user.profileInfo.profilePhoto
          : null
      };
      
      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error('Session save error during registration:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to save session'
          });
        }
        res.status(201).json(result);
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // GET login page
  async getLogin(req, res) {
    res.render("auth/login", { error: null });
  }

  // POST /login
  async login(req, res) {
    try {
      const result = await authService.loginUser(req.body);

      // Require reactivation (Inactive Account)
      if (result.requiresReactivation) {
        // Per rules: allow session creation but force them to reactivate page
        req.session.userId = result.userId;
        req.session.userRole = 'user'; // default; will be replaced after full login
        req.session.save(() => {
          return res.status(200).json({
            success: true,
            requiresReactivation: true,
            message: result.message,
            redirect: '/auth/reactivate'
          });
        });
        return;
      }

      // Banned/locked account
      if (result && result.banned) {
        return res.status(200).json({
          success: false,
          message: result.message,
          redirect: '/auth/ban'
        });
      }

      // Normal login + set session
      req.session.userId = result.user._id;
      req.session.userRole = result.user.role;
      
      //  Lưu thông tin người dùng vào session để hiển thị avatar ở navbar
      req.session.user = {
        id: result.user._id,
        name: `${result.user.profileInfo?.firstName || ''} ${result.user.profileInfo?.lastName || ''}`.trim(),
        role: result.user.role,
        theme: result.user.theme || 'light',
        profilePicture: (result.user.profileInfo?.profilePhoto && result.user.profileInfo.profilePhoto !== 'defaultAvatar.png')
          ? result.user.profileInfo.profilePhoto
          : null
      };

      /* debug removed */

      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error('Session save error during login:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to save session'
          });
        }
        /* debug removed */
        res.status(200).json(result);
      });
    } catch (error) {
      res.status(200).json({
        success: false,
        message: error.message,
      });
    }
  }

  // POST /logout
  async logout(req, res) {
    try {
      req.session.destroy((err) => {
        if (err) throw err;
        res.clearCookie("connect.sid");
        res.redirect("/");
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getSettings(req, res) {
    try {
      const settings = await authService.getSettings(req.session.userId);
      res.status(200).json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updatePassword(req, res) {
    try {
      const result = await authService.updatePassword(req.session.userId, req.body);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Set password for Google OAuth users
  async setPassword(req, res) {
    try {
      const { newPassword } = req.body;
      const result = await authService.setPassword(req.session.userId, newPassword);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async deactivateAccount(req, res) {
    try {
      await authService.deactivateAccount(req.session.userId);
      res
        .status(200)
        .json({ success: true, message: "Account deactivated successfully" });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Authenticated reactivation (no password required)
  async reactivateAccount(req, res) {
    try {
      await authService.reactivateAccount(req.session.userId);
      // Hydrate session.user so navbar updates immediately
      const { User } = require('../models/userSchema');
      const user = await User.findById(req.session.userId).lean();
      if (user) {
        req.session.userRole = user.role;
        req.session.user = {
          id: user._id,
          name: `${user.profileInfo?.firstName || ''} ${user.profileInfo?.lastName || ''}`.trim(),
          role: user.role,
          theme: user.theme || 'light',
          profilePicture: (user.profileInfo?.profilePhoto && user.profileInfo.profilePhoto !== 'defaultAvatar.png')
            ? user.profileInfo.profilePhoto
            : null
        };
      }
      req.session.save(() => {
        res.status(200).json({
          success: true,
          message: "Account reactivated successfully",
        });
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Public reactivation
  async reactivateAccountPublic(req, res) {
    try {
      const { email, password } = req.body;
      await authService.reactivateAccountPublic(email, password);

      res.status(200).json({
        success: true,
        message: "Account reactivated successfully. You may now log in.",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET /auth/reactivate - render reactivation form
  async getReactivate(req, res) {
    try {
      // Provide a simple status for the view
      const status = req.user?.isLocked
        ? 'banned'
        : (!req.user?.isActive ? 'deactivated' : 'active');
      res.render('auth/reactivate', { user: { status } });
    } catch (e) {
      res.render('auth/reactivate', { user: { status: 'deactivated' } });
    }
  }

  // Reset password using signup token
  async resetPassword(req, res) {
    try {
      const { token } = req.params;
      const { newPassword, email } = req.body;

      await authService.resetPassword(token, newPassword, email);

      res.status(200).json({
        success: true,
        message: "Password reset successfully"
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Show token page
  async getToken(req, res) {
    try {
      const result = await authService.getSignupTokenOnce(req.session.userId);

      if (result.alreadyRevealed) {
        return res.render("auth/token", {
          token: null,
          error: "Token has already been revealed"
        });
      }

      res.render("auth/token", {
        token: result.token,
        error: null
      });
    } catch (error) {
      res.status(400).render("auth/token", { 
        token: null, 
        error: error.message 
      });
    }
  }

  // Mark token as viewed
  async markTokenViewed(req, res) {
    try {
      await authService.markSignupTokenRevealed(req.session.userId);
      res.status(200).json({ 
        success: true, 
        message: "Token marked as viewed" 
      });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  // Get set password page for Google OAuth users
  async getSetPassword(req, res) {
    res.render("auth/setpassword", { error: null });
  }
}

module.exports = new AuthController();