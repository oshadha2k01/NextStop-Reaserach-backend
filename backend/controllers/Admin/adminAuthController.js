const jwt = require('jsonwebtoken');
const Admin = require('../../models/Admin/Admin');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (admin) => {
  const secret = process.env.JWT_SECRET || 'your_secret_key';
  return jwt.sign({ id: admin._id }, secret, { expiresIn: '1d' });
};

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, username, email, phoneNo, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!firstName || !lastName || !username || !normalizedEmail || !phoneNo || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email: normalizedEmail }, { phoneNo }],
    });

    if (existingAdmin) {
      if (existingAdmin.username === username) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      if (existingAdmin.email === normalizedEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      if (existingAdmin.phoneNo === phoneNo) {
        return res.status(400).json({ message: 'Phone number already exists' });
      }
    }

    const admin = await Admin.create({
      firstName,
      lastName,
      username,
      email: normalizedEmail,
      phoneNo,
      password,
    });

    const token = generateToken(admin);

    return res.status(201).json({
      message: 'Admin registered successfully.',
      token,
      username: admin.username,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
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
    return res.json({ token, username: admin.username });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    return res.json(admin);
  } catch (err) {
    return res.status(500).json({ error: err.message });
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
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      const existing = await Admin.findOne({ email: normalizedEmail, _id: { $ne: admin._id } });
      if (existing) return res.status(400).json({ message: 'Email already exists' });
      admin.email = normalizedEmail;
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
    return res.json({ message: 'Profile updated successfully', user: updatedAdmin });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    await Admin.findByIdAndDelete(req.user.id);
    return res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};