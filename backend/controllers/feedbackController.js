const Feedback = require("../models/Feedback");

// Get all feedbacks
const getFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate('busId', 'regNo route')
      .sort({ createdAt: -1 })
      .lean();
    
    return res.json(feedbacks);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// Get feedback by ID
const getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('busId', 'regNo route')
      .lean();
    
    if (!feedback) return res.status(404).json({ message: "Feedback not found" });
    return res.json(feedback);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// Create new feedback
const createFeedback = async (req, res) => {
  try {
    const { rider, busId, route, sentiment, note, rating } = req.body;
    
    if (!rider || !note) {
      return res.status(400).json({ message: "Rider and note are required" });
    }

    // Generate ticket ID
    const count = await Feedback.countDocuments();
    const ticketId = `#F-${String(count + 2001).padStart(4, '0')}`;

    const feedback = new Feedback({
      ticketId,
      rider,
      busId: busId || null,
      route: route || '',
      sentiment: sentiment || 'Neutral',
      note,
      rating: rating || 3,
    });

    const created = await feedback.save();
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// Update feedback
const updateFeedback = async (req, res) => {
  try {
    const { sentiment, note, rating } = req.body;
    const update = {};
    
    if (sentiment) update.sentiment = sentiment;
    if (note) update.note = note;
    if (rating !== undefined) update.rating = rating;

    const updated = await Feedback.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).lean();
    
    if (!updated) return res.status(404).json({ message: "Feedback not found" });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// Delete feedback
const deleteFeedback = async (req, res) => {
  try {
    const deleted = await Feedback.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ message: "Feedback not found" });
    return res.json({ message: "Feedback deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

module.exports = {
  getFeedbacks,
  getFeedbackById,
  createFeedback,
  updateFeedback,
  deleteFeedback,
};
