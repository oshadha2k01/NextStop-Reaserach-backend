const mongoose = require('mongoose');

const PendingAdminRegistrationSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNo: { type: String, required: true },
    password: { type: String, required: true },
    // Keep legacy plain OTP field optional for old records during migration.
    otp: { type: String },
    otpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    otpAttempts: { type: Number, default: 0 },
    lastOtpSentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Auto-delete after 15 minutes
PendingAdminRegistrationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

module.exports = mongoose.model('PendingAdminRegistration', PendingAdminRegistrationSchema);
