const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Admin = require('../../models/Admin/Admin');
const PendingAdminRegistration = require('../../models/Admin/PendingAdminRegistration');

const generateToken = (admin) => {
 const secret = process.env.JWT_SECRET || 'your_secret_key';
 return jwt.sign({ id: admin._id }, secret, { expiresIn: '1d' });
};

// Generate 6-digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send OTP via email
const sendOtpEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
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
    const { firstName, lastName, username, email, phoneNo, password } = req.body;

    if (!firstName || !lastName || !username || !email || !phoneNo || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }, { phoneNo }],
    });

    if (existingAdmin) {
      if (existingAdmin.username === username) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      if (existingAdmin.email === email) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      if (existingAdmin.phoneNo === phoneNo) {
        return res.status(400).json({ message: 'Phone number already exists' });
      }
    }

    // Generate OTP
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save pending registration
    await PendingAdminRegistration.findOneAndUpdate(
      { email },
      {
        firstName,
        lastName,
        username,
        email,
        phoneNo,
        password,
        otp,
        otpExpiresAt,
      },
      { upsert: true, new: true }
    );

    // Send OTP via email
    await sendOtpEmail(email, otp);

    // Also log to console for backup
    console.log('\n========================================');
    console.log('📧 ADMIN REGISTRATION OTP');
    console.log('========================================');
    console.log(`Email: ${email}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Expires At: ${otpExpiresAt.toLocaleString()}`);
    console.log('========================================\n');

    res.status(200).json({
      message: 'OTP sent to your email. Please check your inbox (and spam folder).',
      email,
      expiresIn: '5 minutes'
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const pending = await PendingAdminRegistration.findOne({ email });

    if (!pending) {
      return res.status(404).json({ message: 'No pending registration found. Please register first.' });
    }

    if (pending.otpExpiresAt < new Date()) {
      await PendingAdminRegistration.deleteOne({ _id: pending._id });
      return res.status(400).json({ message: 'OTP has expired. Please register again.' });
    }

    if (pending.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP code' });
    }

    // Check if admin already exists (in case created between register and verify)
    const existingAdmin = await Admin.findOne({
      $or: [{ username: pending.username }, { email: pending.email }, { phoneNo: pending.phoneNo }],
    });

    if (existingAdmin) {
      await PendingAdminRegistration.deleteOne({ _id: pending._id });
      return res.status(400).json({ message: 'Admin account already exists' });
    }

    // Create admin account
    const admin = await Admin.create({
      firstName: pending.firstName,
      lastName: pending.lastName,
      username: pending.username,
      email: pending.email,
      phoneNo: pending.phoneNo,
      password: pending.password,
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
