const express = require("express");
const router = express.Router();
const TourController = require("../controllers/tourController");
const SitemapController = require("../controllers/sitemapController");
const authMiddleware = require("../middleware/authMiddleware");
const { uploadTourPhotos } = require("../middleware/uploadMiddleware");

router.post(
  "/createTour",
  uploadTourPhotos,
  authMiddleware.verifyTourGuide,
  TourController.createTour
);
//router.get("/getallTour", TourController.getallTours);
router.get("/getTourById/:id", TourController.getTourById);
router.post(
  "/updateTour/:id",
  authMiddleware.verifyTourGuide,
  TourController.updateTour
);
router.put(
  "/deleteTour/:id",
  authMiddleware.verifyTourGuide,
  TourController.deleteTour
);
router.put(
  "/restoreTour/:id",
  authMiddleware.verifyTourGuide,
  TourController.restoreTour
);
router.get("/getDeletedTours", authMiddleware.verifyTourGuide, TourController.getDeletedTours);
router.post("/tour/:tourId/rating", TourController.rateTour);
router.get("/tour/:tourId/photo/:photoId", TourController.getTourPhotoById);
router.get("/highlightTour", TourController.highlightTour);
router.get("/highlightCity", TourController.highlightCity);

// Front End
router.get("/", TourController.homepage);
router.get("/aboutUs", TourController.aboutUs);
router.get("/discover", TourController.discoverToursPage);
router.get("/createTour", authMiddleware.verifyTourGuide, TourController.getCreateTour);
router.get("/editTour/:tourId", authMiddleware.verifyTourGuide, TourController.getEditTour);
router.get("/tourDetail/:id", TourController.tourDetial);
router.get('/search', TourController.searchAutoComplete);

// Location API routes
router.get("/search-locations", TourController.searchLocations);
router.get("/place-details/:placeId", TourController.getPlaceDetails);

// Sitemap
router.get("/sitemap", SitemapController.getSitemap);

//Tour compare route 
router.get("/compareTours", TourController.compareTours);

module.exports = router;
