const Bus = require("../models/Bus/BusModel");
const Driver = require("../models/Driver");
const Complaint = require("../models/Complaint");
const Feedback = require("../models/Feedback");

// Get all dashboard data in one call
const getDashboardData = async (req, res) => {
  try {
    // Get bus statistics
    const totalBuses = await Bus.countDocuments();
    const approvedBuses = await Bus.countDocuments({ approvalStatus: 'approved' });
    const pendingBuses = await Bus.countDocuments({ approvalStatus: 'pending' });

    // Get buses with minimal data
    const buses = await Bus.find()
      .select('regNo route seats approvalStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get drivers
    const drivers = await Driver.find()
      .populate('busId', 'regNo route')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get complaints
    const complaints = await Complaint.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get feedbacks
    const feedbacks = await Feedback.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return res.json({
      stats: {
        totalBuses,
        approvedBuses,
        pendingBuses,
        activeToday: approvedBuses,
        inMaintenance: 0,
      },
      buses,
      drivers,
      complaints,
      feedbacks,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

module.exports = {
  getDashboardData,
};
