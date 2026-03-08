const mongoose = require('mongoose');

const PassengerSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true},
  telNo: { type: String, required: true, validate: [/^[0-9]{10}$/, "Invalid telephone number"] },
}, { timestamps: true });

module.exports = mongoose.model('Passenger', PassengerSchema);
