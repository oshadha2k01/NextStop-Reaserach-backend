const express = require("express");
const { getDashboardData } = require("../controllers/superadmincontroller.js/dashboardController");

const router = express.Router();

router.get("/", getDashboardData);

module.exports = router;
