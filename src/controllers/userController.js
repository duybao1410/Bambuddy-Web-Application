const userService = require("../services/userService");

class UserController {
  async getPublicProfile(req, res) {
    try {
      const { userId } = req.params;

      // If viewing own profile, redirect to my posts
      if (req.session && req.session.userId && req.session.userId.toString() === userId) {
        return res.redirect('/threads/my-posts');
      }

      const result = await userService.getPublicProfile(userId);

      // If no user or invalid user states, render 404
      if (!result || !result.user || result.user.isLocked || result.user.isActive === false) {
        const path = require('path');
        return res
          .status(404)
          .sendFile(path.join(__dirname, '../../public/html/404.html'));
      }

      // Render public profile view (safe data only)
      return res.render('user/publicProfile', {
        userPublic: result.safeProfile,
        threads: result.threads,
      });
    } catch (error) {
      const path = require('path');
      return res
        .status(404)
        .sendFile(path.join(__dirname, '../../public/html/404.html'));
    }
  }
  async getProfile(req, res) {
    try {
      const profile = await userService.getProfile(req.session.userId);
      // Ensure session user has latest avatar
      if (req.session.user && profile) {
        req.session.user.profilePicture =
          profile.profileInfo?.profilePhoto &&
          profile.profileInfo.profilePhoto !== "defaultAvatar.png"
            ? profile.profileInfo.profilePhoto
            : null;
      }
      res.render("dashboard/user/profile", { profile });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateProfile(req, res) {
    try {
      /* debug removed */

      const updatedProfile = await userService.updateProfile(
        req.session.userId,
        req.body,
        req.file
      );

      // Refresh session avatar for navbar
      if (!req.session.user) req.session.user = {};
      req.session.user.profilePicture =
        updatedProfile?.profileInfo?.profilePhoto &&
        updatedProfile.profileInfo.profilePhoto !== "defaultAvatar.png"
          ? updatedProfile.profileInfo.profilePhoto
          : null;

      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
        }
      });

      res.status(200).json({
        success: true,
        message: "Profile updated",
        data: updatedProfile,
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getBookings(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 4;

      const result = await userService.getBookings(
        req.session.userId,
        page,
        limit
      );
      res.render("dashboard/user/my-trips", {
        bookings: result.bookings,
        pagination: result.pagination,
      });
      //    res.status(200).json({ success: true, data: bookings });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getSettings(req, res) {
    try {
      const settings = await userService.getSettings(req.session.userId);
      res.status(200).json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async renderSettings(req, res) {
    try {
      const settings = await userService
        .getSettings(req.session.userId)
        .catch(() => null);
      // Ensure session user has latest avatar
      if (req.session.user && req.user) {
        req.session.user.profilePicture =
          req.user.profileInfo?.profilePhoto &&
          req.user.profileInfo.profilePhoto !== "defaultAvatar.png"
            ? req.user.profileInfo.profilePhoto
            : null;
      }
      res.render("dashboard/user/settings", { settings });
    } catch (error) {
      res.status(500).render("dashboard/user/settings", {
        user: req.user,
        error: error.message,
      });
    }
  }

  async updatePassword(req, res) {
    try {
      await userService.updatePassword(req.session.userId, req.body);
      res
        .status(200)
        .json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;
      const token = await userService.requestPasswordReset(email);

      res.status(200).json({
        success: true,
        message: "Password reset token generated",
        resetToken: token, // testing purposes
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token } = req.params;
      const { newPassword } = req.body;

      await userService.resetPassword(token, newPassword);

      res.status(200).json({
        success: true,
        message: "Password reset successful",
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async deactivateAccount(req, res) {
    try {
      const { reason } = req.body;
      await userService.deactivateAccount(req.session.userId, reason);
      res
        .status(200)
        .json({ success: true, message: "Account deactivated successfully" });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async reactivateAccount(req, res) {
    try {
      await userService.reactivateAccount(
        req.session.userId,
        req.body.password
      );
      res.status(200).json({
        success: true,
        message: "Account reactivated successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async reactivateAccountPublic(req, res) {
    try {
      const { email, password } = req.body;
      await userService.reactivateAccountPublic(email, password);

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
  async lockUser(req, res, next) {
    try {
      const user = await userService.lockUser(req.params.id);
      res.json({ success: true, message: "User locked", user });
    } catch (err) {
      next(err);
    }
  }

  async verifyGuide(req, res, next) {
    try {
      const { expiryDate } = req.body;
      const user = await userService.verifyGuide(
        req.params.id,
        req.file.path,
        expiryDate
      );
      res.json({ success: true, message: "Guide verified", user });
    } catch (err) {
      next(err);
    }
  }
  async getStats(req, res, next) {
    try {
      const stats = await userService.getOverviewStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  async updateTheme(req, res) {
    try {
      const { theme } = req.body;

      if (!theme || !["light", "dark"].includes(theme)) {
        return res.status(400).json({ success: false, error: "Invalid theme" });
      }

      const updatedTheme = await userService.updateTheme(
        req.session.userId,
        theme
      );

      // Update session for immediate effect
      if (req.session.user) {
        req.session.user.theme = updatedTheme;
      }

      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error("Session save error during theme update:", err);
        }
      });

      res.json({ success: true, theme: updatedTheme });
    } catch (error) {
      console.error("Theme update error:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async saveTour(req, res) {
    try {
      const tourId = req.params.tourId;
      const result = await userService.saveTour(req.session.userId, tourId);
      res.status(200).json({
        success: true,
        message: "Tour saved to wishlist!",
        data: result,
      });
      // res.status(200).json({ success: true, message: 'Tour saved', data: result });  // render
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async removeSavedTour(req, res) {
    try {
      const tourId = req.params.tourId;
      const result = await userService.removeSavedTour(
        req.session.userId,
        tourId
      );
      res.status(200).json({
        success: true,
        message: "Tour removed from saved list",
        data: result,
      }); // render
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getSavedTours(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 5;
      
      const result = await userService.getSavedTours(req.session.userId, page, limit);
      res.render("dashboard/user/save-Tour", { 
        savedTours: result.savedTours,
        pagination: result.pagination
      });
      // res.status(200).json({ success: true, data: savedTours });  // render
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async checkSavedTour(req, res) {
    try {
      const tourId = req.params.tourId;
      const result = await userService.getSavedTours(req.session.userId, 1, 1000); // Get all saved tours for checking
      const isSaved = result.savedTours.some((tour) => tour._id.toString() === tourId);
      res.status(200).json({ success: true, isSaved });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

module.exports = new UserController();
