const mongoose = require('mongoose');

const PassengerSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true },
  telNo: {
    type: String,
    required: true,
    validate: [/^([0-9]{10}|\+94[0-9]{9})$/, 'Invalid telephone number']
  },
}, { timestamps: true });

module.exports = mongoose.model('Passenger', PassengerSchema);