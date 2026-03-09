const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const Admin = require('../../models/Admin/Admin');
const PendingAdminRegistration = require('../../models/Admin/PendingAdminRegistration');

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (admin) => {
 const secret = process.env.JWT_SECRET || 'your_secret_key';
 return jwt.sign({ id: admin._id }, secret, { expiresIn: '1d' });
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
      subject: 'NextStop Admin Registration - OTP Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">NextStop Admin Registration</h2>
          <p>Hello,</p>
          <p>Your OTP for admin registration is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p>This OTP will expire in <strong>5 minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">This is an automated email from NextStop. Please do not reply.</p>
        </div>
      `,
      text: `Your OTP for NextStop admin registration is: ${otp}. This OTP will expire in 5 minutes.`,
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
    const { fullName, email, phoneNo } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!fullName || !normalizedEmail || !phoneNo) {
      return res.status(400).json({ message: 'Missing required fields: fullName, email, phoneNo' });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const existingAdmin = await Admin.findOne({
      $or: [{ email: normalizedEmail }, { phoneNo }],
    });

    if (existingAdmin) {
      if (existingAdmin.email === normalizedEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      if (existingAdmin.phoneNo === phoneNo) {
        return res.status(400).json({ message: 'Phone number already exists' });
      }
    }

    const existingPending = await PendingAdminRegistration.findOne({ email: normalizedEmail });
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
    const pending = await PendingAdminRegistration.findOneAndUpdate(
      { email: normalizedEmail },
      {
        fullName,
        email: normalizedEmail,
        phoneNo,
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
      await PendingAdminRegistration.deleteOne({ _id: pending._id });
      throw mailError;
    }

    // Also log to console for backup
    console.log('\n========================================');
    console.log('📧 ADMIN REGISTRATION OTP');
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
    const { email, otp, username, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !otp || !username || !password) {
      return res.status(400).json({ message: 'Email, OTP, username, and password are required' });
    }

    const pending = await PendingAdminRegistration.findOne({ email: normalizedEmail });

    if (!pending) {
      return res.status(404).json({ message: 'No pending registration found. Please register first.' });
    }

    if (pending.otpExpiresAt < new Date()) {
      await PendingAdminRegistration.deleteOne({ _id: pending._id });
      return res.status(400).json({ message: 'OTP has expired. Please register again.' });
    }

    if ((pending.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
      await PendingAdminRegistration.deleteOne({ _id: pending._id });
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

    // Check if username is already taken
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email: pending.email }, { phoneNo: pending.phoneNo }],
    });

    if (existingAdmin) {
      await PendingAdminRegistration.deleteOne({ _id: pending._id });
      if (existingAdmin.username === username) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      return res.status(400).json({ message: 'Admin account already exists' });
    }

    // Split fullName into firstName and lastName
    const nameParts = pending.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || nameParts[0];

    // Create admin account
    const admin = await Admin.create({
      firstName,
      lastName,
      username,
      email: pending.email,
      phoneNo: pending.phoneNo,
      password,
    });

    // Delete pending registration
    await PendingAdminRegistration.deleteOne({ _id: pending._id });

    // Generate token
    const token = generateToken(admin);

    console.log(`✅ Admin verified and registered: ${admin.email}`);

    res.status(201).json({
      message: 'Email verified! Admin registered successfully.',
      token,
      username: admin.username
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

    const pending = await PendingAdminRegistration.findOne({ email: normalizedEmail });
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

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(admin);
    res.json({ token, username: admin.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, username, email, phoneNo, currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (!(await admin.comparePassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    if (username && username !== admin.username) {
      const existing = await Admin.findOne({ username, _id: { $ne: admin._id } });
      if (existing) return res.status(400).json({ message: 'Username already exists' });
      admin.username = username;
    }

    if (email && email !== admin.email) {
      const existing = await Admin.findOne({ email, _id: { $ne: admin._id } });
      if (existing) return res.status(400).json({ message: 'Email already exists' });
      admin.email = email;
    }

    if (phoneNo && phoneNo !== admin.phoneNo) {
      const existing = await Admin.findOne({ phoneNo, _id: { $ne: admin._id } });
      if (existing) return res.status(400).json({ message: 'Phone number already exists' });
      admin.phoneNo = phoneNo;
    }

    if (firstName) admin.firstName = firstName;
    if (lastName) admin.lastName = lastName;

    if (newPassword) {
      admin.password = newPassword;
    }

    await admin.save();

    const updatedAdmin = await Admin.findById(admin._id).select('-password');
    res.json({ message: 'Profile updated successfully', user: updatedAdmin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    await Admin.findByIdAndDelete(req.user.id);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
