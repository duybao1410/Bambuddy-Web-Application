const express = require("express");
const router = express.Router();

const guideController = require("../controllers/guideController");
const authMiddleware = require("../middleware/authMiddleware");
const {
  uploadCertificate,
  uploadProfilePhoto,
} = require("../middleware/uploadMiddleware");

//GET /dashboard/ - Get guide dashboard page
router.get(
  "/dashboard",
  authMiddleware.verifyTourGuide,
  authMiddleware.blockAdminFromUserFeatures,
  guideController.getGuideDashboard
);

//GET /profile - Get guide profile information
router.get(
  "/profile",
  authMiddleware.verifyTourGuide,
  authMiddleware.blockAdminFromUserFeatures,
  guideController.getGuideProfile
);

//POST /profile - Update guide profile information
router.post(
  "/profile",
  authMiddleware.verifyTourGuide,
  authMiddleware.blockAdminFromUserFeatures,
  uploadProfilePhoto,
  guideController.updateGuideProfile
);

//POST /profile/certification - Update certification
router.post(
  "/profile/certification",
  authMiddleware.verifyTourGuide,
  authMiddleware.blockAdminFromUserFeatures,
  uploadCertificate,
  guideController.addCertification
);

//GET /booking - Get guide booking management page
router.get(
  "/booking",
  authMiddleware.verifyTourGuide,
  authMiddleware.blockAdminFromUserFeatures,
  guideController.getGuideBookingPage
);

//POST /booking/:id/approved
router.post(
  "/booking/:id/approved",
  authMiddleware.verifyTourGuide,
  authMiddleware.blockAdminFromUserFeatures,
  guideController.approvedBooking
);

//POST /booking/:id/cancel
router.post(
  "/booking/:id/cancel",
  authMiddleware.verifyTourGuide,
  authMiddleware.blockAdminFromUserFeatures,
  guideController.cancelBooking
);

// Settings page (reuse user settings view for guides)
router.get(
  "/settings",
  authMiddleware.verifyTourGuide,
  authMiddleware.blockAdminFromUserFeatures,
  guideController.renderSettings
);

// Backward-compat/alias: /guide/setting -> /guide/settings
router.get(
  "/setting",
  authMiddleware.verifyTourGuide,
  authMiddleware.blockAdminFromUserFeatures,
  (req, res) => res.redirect("/guide/settings")
);

//GET GUIDE INFO FOR USER
router.get("/info/:id", guideController.getGuideInfo);

module.exports = router;
