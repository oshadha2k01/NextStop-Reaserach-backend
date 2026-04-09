const Driver = require("../../models/SuperAdmin/Driver");
const Bus = require("../../models/Bus/BusModel");
const jwt = require("jsonwebtoken");

const generateDriverToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'your_secret_key';
  return jwt.sign(payload, secret, { expiresIn: '1d' });
};

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

    if (!name || !busId || !shift || !phone || !licenseNumber) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const bus = await Bus.findById(busId).lean();
    if (!bus) {
      return res.status(400).json({ message: "Invalid bus selected" });
    }

    const existingBusAssignment = await Driver.findOne({ busId }).lean();
    if (existingBusAssignment) {
      return res.status(409).json({ message: "Selected bus is already assigned to another driver" });
    }

    const driver = new Driver({
      name,
      busId,
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
    if (busId !== undefined) {
      if (busId) {
        const bus = await Bus.findById(busId).lean();
        if (!bus) {
          return res.status(400).json({ message: "Invalid bus selected" });
        }

        const existingBusAssignment = await Driver.findOne({
          busId,
          _id: { $ne: req.params.id },
        }).lean();

        if (existingBusAssignment) {
          return res.status(409).json({ message: "Selected bus is already assigned to another driver" });
        }
      }

      update.busId = busId || null;
    }
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

// Driver stats for dashboards
const getDriverStats = async (req, res) => {
  try {
    const [
      totalDrivers,
      activeDrivers,
      inactiveDrivers,
      onLeaveDrivers,
    ] = await Promise.all([
      Driver.countDocuments(),
      Driver.countDocuments({ status: 'active' }),
      Driver.countDocuments({ status: 'inactive' }),
      Driver.countDocuments({ status: 'on-leave' }),
    ]);

    return res.json({
      totalDrivers,
      activeDrivers,
      inactiveDrivers,
      onLeaveDrivers,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};

const getAvailableBuses = async (req, res) => {
  try {
    const [buses, assignedDrivers] = await Promise.all([
      Bus.find({ approvalStatus: 'approved' })
        .select('_id regNo route')
        .sort({ createdAt: -1 })
        .lean(),
      Driver.find({ busId: { $ne: null } }).select('busId').lean(),
    ]);

    const assignedBusIds = new Set(assignedDrivers.map((d) => String(d.busId)));
    const availableBuses = buses.filter((b) => !assignedBusIds.has(String(b._id)));

    return res.json(availableBuses);
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};

const driverLogin = async (req, res) => {
  try {
    const { licenseNumber, phone } = req.body;

    if (!licenseNumber || !phone) {
      return res.status(400).json({ message: 'License number and phone are required' });
    }

    const normalizedLicense = String(licenseNumber).trim();
    const normalizedPhone = String(phone).trim();

    const driver = await Driver.findOne({
      licenseNumber: normalizedLicense,
      phone: normalizedPhone,
    })
      .populate('busId', '_id regNo route')
      .lean();

    if (!driver) {
      return res.status(401).json({ message: 'Invalid driver credentials' });
    }

    if (!driver.busId) {
      return res.status(403).json({ message: 'No bus assigned to this driver. Contact admin.' });
    }

    const token = generateDriverToken({
      id: driver._id,
      role: 'driver',
      busId: driver.busId._id,
    });

    return res.json({
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
        shift: driver.shift,
        status: driver.status,
      },
      bus: driver.busId,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};

const getDriverMe = async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id)
      .populate('busId', '_id regNo route')
      .lean();

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    return res.json({
      driver: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
        shift: driver.shift,
        status: driver.status,
      },
      bus: driver.busId || null,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};

module.exports = {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  getDriverStats,
  getAvailableBuses,
  driverLogin,
  getDriverMe,
};
