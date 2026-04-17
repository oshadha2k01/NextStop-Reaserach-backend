const mongoose = require('mongoose');

const PendingUserRegistrationSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    telNo: { type: String, required: true, trim: true },
    otpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    lastOtpSentAt: { type: Date, required: true },
    failedAttempts: { type: Number, default: 0 },
    termsAccepted: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Cleanup stale pending registrations after 24 hours.
PendingUserRegistrationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('PendingUserRegistration', PendingUserRegistrationSchema);
