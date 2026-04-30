const mongoose = require('mongoose');

const PendingAdminRegistrationSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNo: { type: String, required: true },
    // Username and password will be provided during OTP verification
    username: { type: String },
    password: { type: String },
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
