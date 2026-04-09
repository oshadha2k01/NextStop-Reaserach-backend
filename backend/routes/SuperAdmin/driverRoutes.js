const express = require("express");
const {
	getDrivers,
	getDriverById,
	createDriver,
	updateDriver,
	deleteDriver,
	getDriverStats,
	getAvailableBuses,
	driverLogin,
	getDriverMe,
} = require("../../controllers/SuperAdmin/driverController");
const { protectDriver } = require("../../middleware/Driver/driverAuthMiddleware");

const router = express.Router();

router.get("/stats", getDriverStats);
router.get("/available-buses", getAvailableBuses);
router.post("/login", driverLogin);
router.get("/me", protectDriver, getDriverMe);
router.get("/", getDrivers);
router.get("/:id", getDriverById);
router.post("/", createDriver);
router.put("/:id", updateDriver);
router.delete("/:id", deleteDriver);

module.exports = router;
