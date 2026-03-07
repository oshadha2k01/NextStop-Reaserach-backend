const express = require("express");
const {
	getDrivers,
	getDriverById,
	createDriver,
	updateDriver,
	deleteDriver,
} = require("../../controllers/SuperAdmin/driverController");

const router = express.Router();

router.get("/", getDrivers);
router.get("/:id", getDriverById);
router.post("/", createDriver);
router.put("/:id", updateDriver);
router.delete("/:id", deleteDriver);

module.exports = router;
