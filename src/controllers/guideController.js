const guideService = require("../services/guideService");
const tourService = require("../services/tourService");
const userService = require("../services/userService");

class GuideController {
  async getGuideDashboard(req, res) {
    try {
      const guideId = req.session.userId;
      const dashboardData = await guideService.getGuideDashboard(guideId);
      const toursByGuide = await tourService.getTourByGuideId(guideId);
      res.render("dashboard/guide/dashboard", {
        dashboard: dashboardData,
        tours: toursByGuide,
      });
    } catch (error) {
      console.error("Error fetching guide dashboard data:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async getGuideProfile(req, res) {
    try {
      const guideId = req.session.userId;
      const profileData = await guideService.getGuideProfile(guideId);
      // Ensure session user has latest avatar
      if (req.session.user && profileData) {
        req.session.user.profilePicture =
          profileData.profileInfo?.profilePhoto &&
          profileData.profileInfo.profilePhoto !== "defaultAvatar.png"
            ? profileData.profileInfo.profilePhoto
            : null;
      }

      const certificationHistory = await guideService.getCertificationHistory(
        guideId
      );

      res.render("dashboard/guide/profile", {
        profile: profileData,
        certification: certificationHistory,
      });
    } catch (error) {
      console.error("Error fetching guide profile data:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async updateGuideProfile(req, res) {
    try {
      const guideId = req.session.userId;
      const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
      const updatedData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        city: req.body.city,
        professionalTitle: req.body.professionalTitle,
        bio: req.body.bio,
        phone: req.body.phone,
        facebook: req.body.facebook,
        instagram: req.body.instagram,
        languages: toArray(req.body.languages),
        specializations: toArray(req.body.specializations),
      };

      const result = await guideService.updateGuideProfile(
        guideId,
        updatedData,
        req.file
      );

      // Refresh session avatar for navbar (like user controller does)
      if (!req.session.user) req.session.user = {};
      req.session.user.profilePicture =
        result?.profileInfo?.profilePhoto &&
        result.profileInfo.profilePhoto !== "defaultAvatar.png"
          ? result.profileInfo.profilePhoto
          : null;

      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
        }
      });

      res.redirect("/guide/profile");
    } catch (error) {
      console.error("Error updating guide profile:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  //Add certification
  async addCertification(req, res) {
    try {
      const guideId = req.session.userId;
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No certification file provided" });
      }

      await guideService.addCertification(guideId, req.file);
      res.redirect("/guide/profile");
    } catch (err) {
      console.error("Error updating certification:", err);
      res.status(500).json({ success: false, message: "Interal server error" });
    }
  }

  async getGuideBookingPage(req, res) {
    try {
      const guideId = req.session.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = 2;

      const result = await guideService.getBookings(guideId, page, limit);

      res.render("dashboard/guide/booking-management", {
        bookings: result.bookings,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async approvedBooking(req, res) {
    try {
      const guideId = req.session.userId;
      const bookingId = req.params.id;

      await guideService.approveBooking(bookingId, guideId);

      res.status(200).json({
        success: true,
        message: "Booking approved successfully",
      });
    } catch (error) {
      console.error("Error approving booking:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async cancelBooking(req, res) {
    try {
      const guideId = req.session.userId;
      const bookingId = req.params.id;

      await guideService.cancelBooking(bookingId, guideId);

      res.status(200).json({
        success: true,
        message: "Booking cancelled successfully",
      });
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
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
      res.render("dashboard/guide/settings", { settings });
    } catch (error) {
      res.status(500).render("dashboard/guide/settings", {
        user: req.user,
        error: error.message,
      });
    }
  }

  async getGuideInfo(req, res) {
    try {
      const guideId = req.params.id;
      const page = parseInt(req.query.page) || 1;
      const limit = 4; // Show 4 tours per page

      // Get guide profile information
      const guideData = await guideService.getGuideProfile(guideId);
      if (!guideData) {
        return res.status(404).send("Guide not found");
      }

      // Get tours created by this guide with pagination
      const toursResult = await tourService.getTourByGuideIdWithPagination(
        guideId,
        page,
        limit
      );

      res.render("dashboard/guide/guide-page", {
        guide: guideData,
        tours: toursResult.tours,
        pagination: toursResult.pagination,
        currentPage: page,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to load guide profile page");
    }
  }
}

module.exports = new GuideController();
