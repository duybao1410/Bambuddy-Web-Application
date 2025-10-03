const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const {
  verifySession,
  blockAdminFromUserFeatures, verifyUser
} = require("../middleware/authMiddleware");
const { uploadProfilePhoto } = require("../middleware/uploadMiddleware");

//GET /profile to get user profile page
router.get(
  "/profile",
  verifySession,
  blockAdminFromUserFeatures,
   verifyUser,
  userController.getProfile
);

//POST /profile to update usser profile information
router.post(
  "/profile",
  verifySession,
  blockAdminFromUserFeatures,
  uploadProfilePhoto,
  verifyUser,
  userController.updateProfile
);

//GET /booking to get my trip user page
router.get(
  "/booking",
  verifySession,
  blockAdminFromUserFeatures,
   verifyUser,
  userController.getBookings
);

// Password reset is handled under /auth; no duplicates here
// Settings View (users only)
router.get("/settings", verifySession, verifyUser, userController.renderSettings);
// Settings actions
router.post("/settings/phone", verifySession, verifyUser, async (req, res) => {
  try {
    await userController.updateProfile(req, res);
  } catch (e) {
    console.error("Error updating profile:", e);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// save tours
router.post("/save-tour/:tourId", verifySession, userController.saveTour);
// delete saved tour
router.post(
  "/remove-saved-tour/:tourId",
  verifySession,
  userController.removeSavedTour
);
// get saved tours
router.get("/save-tour", verifySession, userController.getSavedTours);
router.get("/check-saved-tour/:tourId", verifySession, userController.checkSavedTour);

module.exports = router;
