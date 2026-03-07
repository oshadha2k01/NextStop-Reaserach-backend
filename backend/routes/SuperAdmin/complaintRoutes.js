const express = require("express");
const {
	getComplaints,
	getComplaintById,
	createComplaint,
	updateComplaint,
	deleteComplaint,
} = require("../../controllers/SuperAdmin/complaintController");

const router = express.Router();

router.get("/", getComplaints);
router.get("/:id", getComplaintById);
router.post("/", createComplaint);
router.put("/:id", updateComplaint);
router.delete("/:id", deleteComplaint);

module.exports = router;
