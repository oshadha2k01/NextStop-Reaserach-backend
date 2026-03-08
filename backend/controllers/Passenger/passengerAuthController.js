const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const Passenger = require('../../models/Passenger/Passenger');
const PendingPassengerRegistration = require('../../models/Passenger/PendingPassengerRegistration');

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (passenger) => {
 const secret = process.env.JWT_SECRET || 'your_secret_key';
 return jwt.sign({ id: passenger._id }, secret, { expiresIn: '1d' });
};

// Generate cryptographically secure 6-digit OTP.
const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const getResendSecondsLeft = (lastOtpSentAt) => {
  if (!lastOtpSentAt) return 0;
  const elapsedSeconds = Math.floor((Date.now() - new Date(lastOtpSentAt).getTime()) / 1000);
  return Math.max(0, OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds);
};

const assertSmtpConfig = () => {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`SMTP is not configured. Missing: ${missing.join(', ')}`);
  }
};

// Send OTP via email
const sendOtpEmail = async (email, otp) => {
  try {
    assertSmtpConfig();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify connection first
    console.log('🔄 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    const mailOptions = {
      from: process.env.SMTP_FROM || `"NextStop" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'NextStop Passenger Registration - OTP Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">NextStop Passenger Registration</h2>
          <p>Hello,</p>
          <p>Your OTP for passenger registration is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p>This OTP will expire in <strong>5 minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">This is an automated email from NextStop. Please do not reply.</p>
        </div>
      `,
      text: `Your OTP for NextStop passenger registration is: ${otp}. This OTP will expire in 5 minutes.`,
    };

    console.log(`📧 Sending OTP email to: ${email}...`);
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ SMTP Error Details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    
    // Provide specific error message based on error type
    let errorMessage = 'Failed to send OTP email. ';
    if (error.code === 'EAUTH') {
      errorMessage += 'Authentication failed. Check your SMTP_USER and SMTP_PASS (app password).';
    } else if (error.code === 'ECONNECTION' || error.code === 'ESOCKET') {
      errorMessage += 'Cannot connect to SMTP server. Check SMTP_HOST and SMTP_PORT.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage += 'Connection timed out. Check your internet or firewall.';
    } else {
      errorMessage += error.message;
    }
    
    throw new Error(errorMessage);
  }
};

exports.register = async (req, res) => {
  try {
    const { fullName, email, telNo } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!fullName || !normalizedEmail || !telNo) {
      return res.status(400).json({ message: 'Missing required fields: fullName, email, telNo' });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const existingPassenger = await Passenger.findOne({
      $or: [{ email: normalizedEmail }, { telNo }],
    });

    if (existingPassenger) {
      if (existingPassenger.email === normalizedEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      if (existingPassenger.telNo === telNo) {
        return res.status(400).json({ message: 'Telephone number already exists' });
      }
    }

    const existingPending = await PendingPassengerRegistration.findOne({ email: normalizedEmail });
    const resendSecondsLeft = getResendSecondsLeft(existingPending?.lastOtpSentAt);
    if (resendSecondsLeft > 0) {
      return res.status(429).json({
        message: `Please wait ${resendSecondsLeft}s before requesting another OTP.`,
        retryAfterSeconds: resendSecondsLeft,
      });
    }

    // Generate and hash OTP.
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const now = new Date();

    // Save pending registration first, then rollback if email send fails.
    const pending = await PendingPassengerRegistration.findOneAndUpdate(
      { email: normalizedEmail },
      {
        fullName,
        email: normalizedEmail,
        telNo,
        otpHash,
        otpAttempts: 0,
        lastOtpSentAt: now,
        otpExpiresAt,
      },
      { upsert: true, new: true }
    );

    // Send OTP via email to the real recipient mailbox.
    try {
      await sendOtpEmail(normalizedEmail, otp);
    } catch (mailError) {
      await PendingPassengerRegistration.deleteOne({ _id: pending._id });
      throw mailError;
    }

    // Also log to console for backup
    console.log('\n========================================');
    console.log('📧 PASSENGER REGISTRATION OTP');
    console.log('========================================');
    console.log(`Email: ${normalizedEmail}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Expires At: ${otpExpiresAt.toLocaleString()}`);
    console.log('========================================\n');

    res.status(200).json({
      message: 'OTP sent to your email. Please check your inbox (and spam folder).',
      email: normalizedEmail,
      expiresIn: `${OTP_EXPIRY_MINUTES} minutes`
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const pending = await PendingPassengerRegistration.findOne({ email: normalizedEmail });

    if (!pending) {
      return res.status(404).json({ message: 'No pending registration found. Please register first.' });
    }

    if (pending.otpExpiresAt < new Date()) {
      await PendingPassengerRegistration.deleteOne({ _id: pending._id });
      return res.status(400).json({ message: 'OTP has expired. Please register again.' });
    }

    if ((pending.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
      await PendingPassengerRegistration.deleteOne({ _id: pending._id });
      return res.status(429).json({ message: 'Maximum OTP attempts exceeded. Please register again.' });
    }

    const otpMatches = pending.otpHash
      ? await bcrypt.compare(otp, pending.otpHash)
      : pending.otp === otp;

    if (!otpMatches) {
      pending.otpAttempts = (pending.otpAttempts || 0) + 1;
      await pending.save();
      const attemptsLeft = Math.max(0, OTP_MAX_ATTEMPTS - pending.otpAttempts);
      return res.status(400).json({
        message: 'Invalid OTP code',
        attemptsLeft,
      });
    }

    // Check if email already registered
    const existingPassenger = await Passenger.findOne({
      $or: [{ email: pending.email }, { telNo: pending.telNo }],
    });

    if (existingPassenger) {
      await PendingPassengerRegistration.deleteOne({ _id: pending._id });
      return res.status(400).json({ message: 'Passenger account already exists' });
    }

    // Create passenger account
    const passenger = await Passenger.create({
      fullName: pending.fullName,
      email: pending.email,
      telNo: pending.telNo,
    });

    // Delete pending registration
    await PendingPassengerRegistration.deleteOne({ _id: pending._id });

    // Generate token
    const token = generateToken(passenger);

    console.log(`✅ Passenger verified and registered: ${passenger.email}`);

    res.status(201).json({
      message: 'Email verified! Passenger registered successfully.',
      token,
      passenger: {
        id: passenger._id,
        fullName: passenger.fullName,
        email: passenger.email,
        telNo: passenger.telNo,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const pending = await PendingPassengerRegistration.findOne({ email: normalizedEmail });
    if (!pending) {
      return res.status(404).json({ message: 'No pending registration found. Please register first.' });
    }

    const resendSecondsLeft = getResendSecondsLeft(pending.lastOtpSentAt);
    if (resendSecondsLeft > 0) {
      return res.status(429).json({
        message: `Please wait ${resendSecondsLeft}s before requesting another OTP.`,
        retryAfterSeconds: resendSecondsLeft,
      });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const now = new Date();

    await sendOtpEmail(normalizedEmail, otp);

    pending.otpHash = otpHash;
    pending.otpExpiresAt = otpExpiresAt;
    pending.otpAttempts = 0;
    pending.lastOtpSentAt = now;
    pending.otp = undefined;
    await pending.save();

    res.status(200).json({
      message: 'A new OTP has been sent to your email.',
      email: normalizedEmail,
      expiresIn: `${OTP_EXPIRY_MINUTES} minutes`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const passenger = await Passenger.findById(req.user.id);
    if (!passenger) {
      return res.status(404).json({ message: 'Passenger not found' });
    }
    res.json(passenger);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { fullName, email, telNo } = req.body;
    const passenger = await Passenger.findById(req.user.id);

    if (!passenger) {
      return res.status(404).json({ message: 'Passenger not found' });
    }

    if (email && email !== passenger.email) {
      const existing = await Passenger.findOne({ email, _id: { $ne: passenger._id } });
      if (existing) return res.status(400).json({ message: 'Email already exists' });
      passenger.email = email;
    }

    if (telNo && telNo !== passenger.telNo) {
      const existing = await Passenger.findOne({ telNo, _id: { $ne: passenger._id } });
      if (existing) return res.status(400).json({ message: 'Telephone number already exists' });
      passenger.telNo = telNo;
    }

    if (fullName) passenger.fullName = fullName;

    await passenger.save();

    res.json({ message: 'Profile updated successfully', user: passenger });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    const passenger = await Passenger.findById(req.user.id);

    if (!passenger) {
      return res.status(404).json({ message: 'Passenger not found' });
    }

    await Passenger.findByIdAndDelete(req.user.id);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
