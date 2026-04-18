const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const Passenger = require('../../models/UserRegister/Passenger');
const PendingUserRegistration = require('../../models/UserRegister/PendingUserRegistration');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{6}$/;
const DEFAULT_OTP_EXPIRY_SECONDS = Number(process.env.OTP_EXPIRY_SECONDS || 600);
const DEFAULT_OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 120);
const DEFAULT_SESSION_VALIDITY_DAYS = Number(process.env.USER_REGISTER_SESSION_VALIDITY_DAYS || 30);

function normalizePhone(phoneInput) {
  const input = String(phoneInput || '').trim().replace(/\s+/g, '');

  if (/^\+94\d{9}$/.test(input)) {
    return input;
  }

  if (/^0\d{9}$/.test(input)) {
    return `+94${input.slice(1)}`;
  }

  if (/^\d{9}$/.test(input)) {
    return `+94${input}`;
  }

  return null;
}

function createOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getJwtSecret() {
  return process.env.JWT_SECRET || 'your_secret_key';
}

function getOtpConfig() {
  return {
    expirySeconds: DEFAULT_OTP_EXPIRY_SECONDS,
    resendCooldownSeconds: DEFAULT_OTP_RESEND_COOLDOWN_SECONDS,
  };
}

function getSessionConfig() {
  return {
    validityDays: DEFAULT_SESSION_VALIDITY_DAYS,
    validityMs: DEFAULT_SESSION_VALIDITY_DAYS * 24 * 60 * 60 * 1000,
  };
}

function getOtpDebugPayload(otp) {
  if (process.env.NODE_ENV === 'production') {
    return {};
  }
  return { debugOtp: otp };
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendOtpEmail(email, otp, firstName, expirySeconds) {
  const transporter = createTransporter();
  const from = process.env.OTP_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@nextstop.local';

  if (!transporter) {
    console.log(`[OTP DEV] email=${email} otp=${otp}`);
    return;
  }

  const expiryMinutes = Math.ceil(expirySeconds / 60);

  try {
    await transporter.sendMail({
      from,
      to: email,
      subject: 'NextStop Email Verification Code',
      text: `Hi ${firstName}, your verification code is ${otp}. It expires in ${expiryMinutes} minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.6; color:#222;">
          <h2 style="color:#ff6b35;">NextStop Verification</h2>
          <p>Hi ${firstName},</p>
          <p>Your one-time verification code is:</p>
          <p style="font-size:28px; font-weight:bold; letter-spacing:4px; color:#ff6b35;">${otp}</p>
          <p>This code expires in ${expiryMinutes} minutes.</p>
        </div>
      `,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OTP DEV FALLBACK] email=${email} otp=${otp} smtpError=${error.message}`);
      return;
    }
    throw error;
  }
}

function createAuthToken(passenger) {
  const { validityDays } = getSessionConfig();
  return jwt.sign({ id: passenger._id }, getJwtSecret(), { expiresIn: `${validityDays}d` });
}

function getAuthExpiryDate() {
  const { validityMs } = getSessionConfig();
  return new Date(Date.now() + validityMs);
}

exports.registerAndSendOtp = async (req, res) => {
  try {
    const { firstName, email, phone, telNo, acceptedTerms } = req.body;

    const resolvedFirstName = String(firstName || '').trim();
    const resolvedEmail = String(email || '').trim().toLowerCase();
    const resolvedPhone = normalizePhone(phone || telNo);

    if (!resolvedFirstName || resolvedFirstName.length < 2) {
      return res.status(400).json({ message: 'First name must be at least 2 characters' });
    }

    if (!EMAIL_REGEX.test(resolvedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (!resolvedPhone) {
      return res.status(400).json({ message: 'Phone number must be a valid Sri Lankan number' });
    }

    if (acceptedTerms !== undefined && acceptedTerms !== true) {
      return res.status(400).json({ message: 'You must accept Terms & Conditions' });
    }

    const existingPassenger = await Passenger.findOne({
      $or: [{ email: resolvedEmail }, { telNo: resolvedPhone }],
    });

    if (existingPassenger) {
      const sessionStillActive = existingPassenger.authExpiresAt && existingPassenger.authExpiresAt.getTime() > Date.now();
      if (sessionStillActive) {
        return res.status(409).json({
          message: 'Account already active. Please open the app and use your stored session.',
          authExpiresAt: existingPassenger.authExpiresAt,
        });
      }
    }

    const otp = createOtpCode();
    const otpHash = await bcrypt.hash(otp, 10);
    const { expirySeconds, resendCooldownSeconds } = getOtpConfig();
    const now = new Date();
    const otpExpiresAt = new Date(now.getTime() + expirySeconds * 1000);

    await PendingUserRegistration.findOneAndUpdate(
      { email: resolvedEmail },
      {
        firstName: resolvedFirstName,
        email: resolvedEmail,
        telNo: resolvedPhone,
        otpHash,
        otpExpiresAt,
        lastOtpSentAt: now,
        failedAttempts: 0,
        termsAccepted: acceptedTerms !== false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendOtpEmail(resolvedEmail, otp, resolvedFirstName, expirySeconds);

    return res.status(200).json({
      message: 'OTP sent to email',
      email: resolvedEmail,
      expiresInSeconds: expirySeconds,
      resendAvailableInSeconds: resendCooldownSeconds,
      ...getOtpDebugPayload(otp),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
};

exports.verifyOtpAndCreateUser = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const resolvedEmail = String(email || '').trim().toLowerCase();
    const otpCode = String(otp || '').trim();

    if (!EMAIL_REGEX.test(resolvedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (!OTP_REGEX.test(otpCode)) {
      return res.status(400).json({ message: 'OTP must be 6 digits' });
    }

    const pending = await PendingUserRegistration.findOne({ email: resolvedEmail });
    if (!pending) {
      return res.status(404).json({ message: 'No pending registration found for this email' });
    }

    if (pending.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP expired. Please request a new code.' });
    }

    const matched = await bcrypt.compare(otpCode, pending.otpHash);
    if (!matched) {
      pending.failedAttempts += 1;
      await pending.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    let passenger = await Passenger.findOne({
      $or: [{ email: pending.email }, { telNo: pending.telNo }],
    });

    if (!passenger) {
      passenger = await Passenger.create({
        firstName: pending.firstName,
        email: pending.email,
        telNo: pending.telNo,
        lastVerifiedAt: new Date(),
        authExpiresAt: getAuthExpiryDate(),
      });
    } else {
      passenger.firstName = pending.firstName;
      passenger.email = pending.email;
      passenger.telNo = pending.telNo;
      passenger.lastVerifiedAt = new Date();
      passenger.authExpiresAt = getAuthExpiryDate();
      await passenger.save();
    }

    await PendingUserRegistration.deleteOne({ _id: pending._id });

    const token = createAuthToken(passenger);

    return res.status(200).json({
      message: 'Email verified successfully',
      token,
      passenger: {
        id: passenger._id,
        firstName: passenger.firstName,
        email: passenger.email,
        telNo: passenger.telNo,
        authExpiresAt: passenger.authExpiresAt,
      },
      authExpiresAt: passenger.authExpiresAt,
      sessionValidityDays: getSessionConfig().validityDays,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to verify OTP', error: error.message });
  }
};

exports.checkSession = async (req, res) => {
  try {
    const passenger = req.user;

    if (!passenger) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!passenger.authExpiresAt || passenger.authExpiresAt.getTime() <= Date.now()) {
      return res.status(401).json({ message: 'Session expired. Please register again.' });
    }

    return res.status(200).json({
      authenticated: true,
      passenger: {
        id: passenger._id,
        firstName: passenger.firstName,
        email: passenger.email,
        telNo: passenger.telNo,
      },
      authExpiresAt: passenger.authExpiresAt,
      sessionValidityDays: getSessionConfig().validityDays,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to validate session', error: error.message });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const resolvedEmail = String(email || '').trim().toLowerCase();

    if (!EMAIL_REGEX.test(resolvedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const pending = await PendingUserRegistration.findOne({ email: resolvedEmail });
    if (!pending) {
      return res.status(404).json({ message: 'No pending registration found for this email' });
    }

    const { expirySeconds, resendCooldownSeconds } = getOtpConfig();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - pending.lastOtpSentAt.getTime()) / 1000);

    if (elapsedSeconds < resendCooldownSeconds) {
      return res.status(429).json({
        message: 'Please wait before requesting another OTP',
        resendAvailableInSeconds: resendCooldownSeconds - elapsedSeconds,
      });
    }

    const otp = createOtpCode();
    pending.otpHash = await bcrypt.hash(otp, 10);
    pending.otpExpiresAt = new Date(now + expirySeconds * 1000);
    pending.lastOtpSentAt = new Date(now);
    pending.failedAttempts = 0;
    await pending.save();

    await sendOtpEmail(pending.email, otp, pending.firstName, expirySeconds);

    return res.status(200).json({
      message: 'OTP resent successfully',
      email: pending.email,
      expiresInSeconds: expirySeconds,
      resendAvailableInSeconds: resendCooldownSeconds,
      ...getOtpDebugPayload(otp),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to resend OTP', error: error.message });
  }
};
