const mongoose = require('mongoose');

const PendingPassengerRegistrationSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  telNo: { type: String, required: true },
  otpHash: { type: String },
  otp: { type: String }, // Legacy field for backward compatibility
  otpAttempts: { type: Number, default: 0 },
  lastOtpSentAt: { type: Date },
  otpExpiresAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('PendingPassengerRegistration', PendingPassengerRegistrationSchema);
