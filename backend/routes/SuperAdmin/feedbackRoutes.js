const express = require("express");
const {
	getFeedbacks,
	getFeedbackById,
	createFeedback,
	updateFeedback,
	deleteFeedback,
	getFeedbackStats,
} = require("../../controllers/SuperAdmin/feedbackController");

const router = express.Router();

router.get("/stats", getFeedbackStats);
router.get("/", getFeedbacks);
router.get("/:id", getFeedbackById);
router.post("/", createFeedback);
router.put("/:id", updateFeedback);
router.delete("/:id", deleteFeedback);

module.exports = router;
