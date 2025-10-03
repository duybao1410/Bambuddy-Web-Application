const TourService = require("../services/tourService");
const LocationService = require("../services/locationService");
const sanitizeHtml = require("sanitize-html");
const mongoSanitize = require("mongo-sanitize");
const path = require('path');

class TourController {
  async createTour(req, res) {
    try {
      // Lấy ảnh upload (nếu có)
      const imagePaths = req.files?.map((file) => file.filename) || [];

      // req.body.category có thể là string hoặc mảng string, convert luôn về mảng
      let categories = [];
      if (req.body.category) {
        if (Array.isArray(req.body.category)) {
          categories = req.body.category;
        } else {
          categories = [req.body.category];
        }
      }

      // availability gửi dưới dạng JSON string (vd: '[{"date":"2025-08-12","isBooked":false}]')
      let availability = [];
      if (req.body.availability) {
        try {
          availability = JSON.parse(req.body.availability);
        } catch (e) {
          return res
            .status(400)
            .json({ success: false, error: "Invalid availability format" });
        }
      }

      // durationMinutes, pricing phải chuyển sang số
      const durationMinutes = Number(req.body.durationMinutes);
      const pricing = Number(req.body.pricing);

      if (isNaN(durationMinutes) || isNaN(pricing)) {
        return res.status(400).json({
          success: false,
          error: "Duration and pricing must be numbers",
        });
      }

      // Validate required location data
      if (
        !req.body.address ||
        !req.body.city ||
        !req.body.lat ||
        !req.body.lng
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Location data is incomplete. Please select a location from the suggestions.",
        });
      }

      const tourData = {
        title: sanitizeHtml(req.body.title),
        description: sanitizeHtml(req.body.description),
        location: {
          address: req.body.address,
          city: req.body.city,
          coordinates: {
            lat: parseFloat(req.body.lat),
            lng: parseFloat(req.body.lng),
          },
          placeId: req.body.placeId || "",
        },
        durationMinutes,
        category: categories,
        pricing,
        images: imagePaths,
        availability,
        itinerary: sanitizeHtml(req.body.itinerary) || "",
        isActive:
          req.body.isActive !== undefined ? req.body.isActive === "true" : true,
      };

      const tour = await TourService.createTour(tourData, req.session.userId);
      res.redirect("/guide/dashboard");
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /*async getallTours(req, res) {
    try {
      const {
        city,
        rating,
        category,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder,
        page = 1,
        limit = 10,
        search,
        minDuration,
        maxDuration,
      } = req.query;

      const result = await TourService.getallTours({
        city,
        rating: Number(rating),
        category,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder,
        page: Number(page),
        limit: Number(limit),
        search,
        minDuration,
        maxDuration,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  } */
  async getTourById(req, res) {
    const tourId = req.params.id;
    try {
      const tour = await TourService.getTourById(tourId);
      if (!tour) {
        return res
          .status(404)
          .json({ success: false, error: "Tour not found" });
      }
      res.status(200).json({ success: true, data: tour });
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  async rateTour(req, res) {
    try {
      const userId = req.session.userId;
      const { tourId } = req.params;
      const { count, text } = req.body;

      const sanitizedText = sanitizeHtml(text);

      const rating = await TourService.rateTour({
        userId,
        tourId,
        count,
        text: sanitizedText,
      });
      res.status(201).json({ success: true, data: rating });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateTour(req, res) {
    try {
      // Handle categories - can be string or array
      let categories = [];
      if (req.body.category) {
        if (Array.isArray(req.body.category)) {
          categories = req.body.category;
        } else {
          categories = [req.body.category];
        }
      }

      // Handle availability JSON parsing
      let availability = [];
      if (req.body.availability) {
        try {
          availability = JSON.parse(req.body.availability);
        } catch (e) {
          return res.status(400).json({
            success: false,
            error: "Invalid availability format",
          });
        }
      }

      // Validate and convert numeric fields
      const durationMinutes = Number(req.body.durationMinutes);
      const pricing = Number(req.body.pricing);

      if (isNaN(durationMinutes) || isNaN(pricing)) {
        return res.status(400).json({
          success: false,
          error: "Duration and pricing must be valid numbers",
        });
      }

      // Validate required location data
      if (
        !req.body.address ||
        !req.body.city ||
        !req.body.lat ||
        !req.body.lng
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Location data is incomplete. Please select a location from the suggestions",
        });
      }

      const tourData = {
        title: sanitizeHtml(req.body.title),
        description: sanitizeHtml(req.body.description),
        location: {
          address: req.body.address,
          city: req.body.city,
          coordinates: {
            lat: parseFloat(req.body.lat),
            lng: parseFloat(req.body.lng),
          },
          placeId: req.body.placeId || "",
        },
        durationMinutes,
        category: categories,
        pricing,
        availability,
        itinerary: sanitizeHtml(req.body.itinerary) || "",
        isActive:
          req.body.isActive !== undefined ? req.body.isActive === "true" : true,
      };

      const tourId = req.params.id;
      const guideId = req.session.userId;

      const updatedTour = await TourService.updateTour(
        tourData,
        tourId,
        guideId
      );
      if (!updatedTour) {
        return res.status(404).json({
          success: false,
          error: "Tour not found or you are not authorized to edit this tour",
        });
      }

      res.redirect("/guide/dashboard");
    } catch (error) {
      console.error(error);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to update tour. Please try again",
      });
    }
  }

  async getEditTour(req, res) {
    try {
      const tourId = req.params.tourId;
      const tour = await TourService.getTourById(tourId);

      if (!tour) {
        return res.status(404).send("Tour not found");
      }
      res.render("dashboard/guide/edit-tour", { tour });
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to load edit Tour Page");
    }
  }

  async deleteTour(req, res) {
    try {
      const deletedTour = await TourService.deleteTour(
        req.params.id,
        req.session.userId
      );
      if (!deletedTour) {
        return res
          .status(404)
          .json({ success: false, error: "Tour not found" });
      }
      res.status(200).json({ success: true, data: deletedTour });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async restoreTour(req, res) {
    try {
      const restoreTour = await TourService.restoreTour(
        req.params.id,
        req.session.userId
      );
      if (!restoreTour) {
        return res
          .status(404)
          .json({ success: false, error: "Tour not found" });
      }
      res.status(200).json({ success: true, data: restoreTour });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getDeletedTours(req, res) {
    try {
      const deletedTours = await TourService.getDeletedTours();
      res.status(200).json({ success: true, data: deletedTours });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getTourPhotoById(req, res) {
    try {
      const { tourId, photoId } = req.params;
      const photo = await TourService.getTourPhotoById(tourId, photoId);
      res.status(200).json({ success: true, data: photo });
    } catch (err) {
      console.error("Error seeing photo:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Internal server error",
      });
    }
  }

  async highlightTour(req, res) {
    try {
      const highlightTour = await TourService.highlightTour();
      res.status(200).json({ success: true, data: highlightTour });
    } catch (err) {
      console.error("Error respons highlight Tour:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Internal server error",
      });
    }
  }

  async highlightCity(req, res) {
    try {
      const highlightCity = await TourService.highlightCity();
      res.status(200).json({ success: true, data: highlightCity });
    } catch (err) {
      console.error("Error respons highlight City:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Internal server error",
      });
    }
  }

  // Front End
  async homepage(req, res) {
    try {
      const highlightTours = await TourService.highlightTour();
      const highlightCities = await TourService.highlightCity();

      res.render("pages/home", {
        highlightTours,
        highlightCities,
        query: req.query,
        user: req.session.user || null,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to load homepage");
    }
  }

  async discoverToursPage(req, res) {
    try {
      let { sortBy, sortOrder } = req.query;

      // Nếu sortBy có dạng "pricing|desc" thì tách ra
      if (sortBy && sortBy.includes("|")) {
        const parts = sortBy.split("|");
        sortBy = parts[0];
        sortOrder = parts[1];
      }

      // Sanitize các tham số query
      const sanitizedCity = mongoSanitize(req.query.city);
      const sanitizedRating = mongoSanitize(req.query.rating);
      const sanitizedCategory = mongoSanitize(req.query.category);
      const sanitizedMinPrice = mongoSanitize(req.query.minPrice);
      const sanitizedMaxPrice = mongoSanitize(req.query.maxPrice);
      const sanitizedSortBy = mongoSanitize(sortBy);
      const sanitizedSortOrder = mongoSanitize(sortOrder);
      const sanitizedPage = mongoSanitize(req.query.page || 1);
      const sanitizedLimit = mongoSanitize(req.query.limit || 9);
      const sanitizedSearch = mongoSanitize(req.query.search);
      const sanitizedMinDuration = mongoSanitize(req.query.minDuration);
      const sanitizedMaxDuration = mongoSanitize(req.query.maxDuration);

      // Thực hiện tìm kiếm các tour với tham số đã được sanitize
      const result = await TourService.getallTours({
        city: sanitizedCity,
        rating: Number(sanitizedRating),
        category: sanitizedCategory,
        minPrice: sanitizedMinPrice,
        maxPrice: sanitizedMaxPrice,
        sortBy: sanitizedSortBy,
        sortOrder: sanitizedSortOrder,
        page: Number(sanitizedPage),
        limit: Number(sanitizedLimit),
        search: sanitizedSearch,
        minDuration: sanitizedMinDuration,
        maxDuration: sanitizedMaxDuration,
      });

      // Define buildQuery function
      const buildQuery = (params) => new URLSearchParams(params).toString();

      // Kiểm tra nếu là yêu cầu AJAX (API) hay yêu cầu render trang HTML
      if (req.xhr || req.headers.accept.includes("application/json")) {
        // Nếu là yêu cầu API, trả về JSON
        return res.status(200).json({ success: true, data: result });
      } else {
        // Nếu là yêu cầu render trang HTML, trả về view
        return res.render("pages/discover", {
          data: result,
          query: req.query,
          buildQuery,
        });
      }
    } catch (err) {
      console.error(err);
      // Nếu có lỗi, trả về 500 cho yêu cầu render trang HTML
      res.status(500).send("Failed to load tour page");
    }
  }

  async tourDetial(req, res) {
    try {
      const result = await TourService.getTourById(req.params.id);

      res.render("pages/tour-detail", {
        data: result,
        query: req.query,
      });
    } catch (err) {
      console.error(err);
      if (err.message.includes("Invalid tour ID")) {
        return res.status(404).sendFile(path.join(__dirname, '../../public/html/404.html'));
      }
  
  
      // Các lỗi khác → 500
      return res.status(500).sendFile(path.join(__dirname, '../../public/html/500.html'));
    }
  
     // res.status(500).send("Failed to load tour page");
    }
  

  async getCreateTour(req, res) {
    try {
      res.render("dashboard/guide/create-tour");
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to load create Tour Page");
    }
  }

  async searchLocations(req, res) {
    try {
      const { input } = req.query;

      if (!input) {
        return res.status(400).json({
          success: false,
          error: "Search input is required",
        });
      }

      const result = await LocationService.searchPlaces(input);
      res.status(200).json({ success: true, data: result.predictions });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPlaceDetails(req, res) {
    try {
      const { placeId } = req.params;

      if (!placeId) {
        return res.status(400).json({
          success: false,
          error: "Place ID is required",
        });
      }

      const result = await LocationService.getPlaceDetails(placeId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
  async searchAutoComplete(req, res) {
    try {
      const Searchresult = await TourService.searchAutoComplete(
        req.query.search
      );
      res.status(200).json({ success: true, data: Searchresult });
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to load tour page");
    }
  }
  async aboutUs(req, res) {
    try {
      res.render("pages/about");
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to load about us page");
    }
  }

  async compareTours(req, res) {
    // localhost:3000/compareTours?tours=id1,id2,id3
    const ids = req.query.tours.split(",");
    try {
      const tours = await TourService.findTourToCompare(ids);
      //  res.status(200).json({ success: true, data: tours });
      res.render("pages/tour-Compare", { tours });
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to load compare page");
    }
  }
}
module.exports = new TourController();
