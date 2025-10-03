const express = require('express');
const router = express.Router();
const Feedback = require('../models/feedbackSchema')

router.post('/feedback', async (req, res) => {
    try {
        const feedbackData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        feedbackType: req.body.feedbackType,
        subject: req.body.subject,
        message: req.body.message,
        }

        await Feedback.create(feedbackData);

        res.redirect("/aboutUs?success=feedback_submitted");
    } catch(error) {
        console.error("Feedback submission error:", error);
        res.redirect("/aboutUs?error=submission_failed");
    }
    
});

module.exports = router;