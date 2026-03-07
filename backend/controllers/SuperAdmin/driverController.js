const Driver = require("../../models/SuperAdmin/Driver");
const Bus = require("../../models/Bus/BusModel");

// Get all drivers
const getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find()
      .populate('busId', 'regNo route')
      .sort({ createdAt: -1 })
      .lean();

    return res.json(drivers);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// Get driver by ID
const getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
      .populate('busId', 'regNo route')
      .lean();

    if (!driver) return res.status(404).json({ message: "Driver not found" });
    return res.json(driver);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// Create new driver
const createDriver = async (req, res) => {
  try {
    const { name, busId, shift, rating, phone, licenseNumber, status } = req.body;

    if (!name || !shift || !phone || !licenseNumber) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const driver = new Driver({
      name,
      busId: busId || null,
      shift,
      rating: rating || 0,
      phone,
      licenseNumber,
      status: status || 'active',
    });

    const created = await driver.save();
    return res.status(201).json(created);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "License number already exists" });
    }
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// Update driver
const updateDriver = async (req, res) => {
  try {
    const { name, busId, shift, rating, phone, licenseNumber, status } = req.body;
    const update = {};

    if (name) update.name = name;
    if (busId !== undefined) update.busId = busId;
    if (shift) update.shift = shift;
    if (rating !== undefined) update.rating = rating;
    if (phone) update.phone = phone;
    if (licenseNumber) update.licenseNumber = licenseNumber;
    if (status) update.status = status;

    const updated = await Driver.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: "Driver not found" });
    return res.json(updated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "License number already exists" });
    }
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// Delete driver
const deleteDriver = async (req, res) => {
  try {
    const deleted = await Driver.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ message: "Driver not found" });
    return res.json({ message: "Driver deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

module.exports = {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
};
