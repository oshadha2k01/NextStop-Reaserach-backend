const express = require("express");
const multer = require("multer");
const {
    createBus,
    getBuses,
    getBusById,
    getBusImage,
    updateBus,
    deleteBus,
    approveBus,
    rejectBus,
    updateTripStatus,
    getBusStats,
} = require("../../controllers/Bus/BusController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


router.get("/", getBuses);
router.post("/", upload.single("image"), createBus);
router.get("/stats", getBusStats);


router.put("/trip-status", updateTripStatus);



router.get("/:id", getBusById);
router.get("/:id/image", getBusImage);
router.put("/:id", upload.single("image"), updateBus);
router.delete("/:id", deleteBus);
router.post("/:id/approve", approveBus);
router.post("/:id/reject", rejectBus);

module.exports = router;