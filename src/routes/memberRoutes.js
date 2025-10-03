const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");

// Public member profile (no auth required)
// GET /member/:userId
router.get("/member/:userId", userController.getPublicProfile);

module.exports = router;


