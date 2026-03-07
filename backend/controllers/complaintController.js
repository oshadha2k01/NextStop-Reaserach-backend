const Complaint = require("../models/Complaint");

// Get all complaints
const getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('busId', 'regNo route')
      .sort({ createdAt: -1 })
      .lean();
    
    return res.json(complaints);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// Get complaint by ID
const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('busId', 'regNo route')
      .lean();
    
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    return res.json(complaint);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// Create new complaint
const createComplaint = async (req, res) => {
  try {
    const { route, busId, summary, description, submittedBy, priority } = req.body;
    
    if (!route || !summary) {
      return res.status(400).json({ message: "Route and summary are required" });
    }

    // Generate ticket ID
    const count = await Complaint.countDocuments();
    const ticketId = `#C-${String(count + 1001).padStart(4, '0')}`;

    const complaint = new Complaint({
      ticketId,
      route,
      busId: busId || null,
      summary,
      description: description || '',
      submittedBy: submittedBy || 'Anonymous',
      priority: priority || 'Medium',
    });

    const created = await complaint.save();
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// Update complaint
const updateComplaint = async (req, res) => {
  try {
    const { status, summary, description, priority } = req.body;
    const update = {};
    
    if (status) update.status = status;
    if (summary) update.summary = summary;
    if (description !== undefined) update.description = description;
    if (priority) update.priority = priority;

    const updated = await Complaint.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).lean();
    
    if (!updated) return res.status(404).json({ message: "Complaint not found" });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// Delete complaint
const deleteComplaint = async (req, res) => {
  try {
    const deleted = await Complaint.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ message: "Complaint not found" });
    return res.json({ message: "Complaint deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

module.exports = {
  getComplaints,
  getComplaintById,
  createComplaint,
  updateComplaint,
  deleteComplaint,
};
