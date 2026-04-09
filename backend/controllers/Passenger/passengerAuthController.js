const jwt = require('jsonwebtoken');
const Passenger = require('../../models/Passenger/Passenger');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (passenger) => {
  const secret = process.env.JWT_SECRET || 'your_secret_key';
  return jwt.sign({ id: passenger._id }, secret, { expiresIn: '1d' });
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

    const passenger = await Passenger.create({
      fullName,
      email: normalizedEmail,
      telNo,
    });

    const token = generateToken(passenger);

    return res.status(201).json({
      message: 'Passenger registered successfully.',
      token,
      passenger: {
        id: passenger._id,
        fullName: passenger.fullName,
        email: passenger.email,
        telNo: passenger.telNo,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, telNo } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !telNo) {
      return res.status(400).json({ message: 'Email and telNo are required' });
    }

    const passenger = await Passenger.findOne({ email: normalizedEmail, telNo });
    if (!passenger) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(passenger);
    return res.json({
      token,
      passenger: {
        id: passenger._id,
        fullName: passenger.fullName,
        email: passenger.email,
        telNo: passenger.telNo,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const passenger = await Passenger.findById(req.user.id);
    if (!passenger) {
      return res.status(404).json({ message: 'Passenger not found' });
    }
    return res.json(passenger);
  } catch (err) {
    return res.status(500).json({ error: err.message });
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
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      const existing = await Passenger.findOne({ email: normalizedEmail, _id: { $ne: passenger._id } });
      if (existing) return res.status(400).json({ message: 'Email already exists' });
      passenger.email = normalizedEmail;
    }

    if (telNo && telNo !== passenger.telNo) {
      const existing = await Passenger.findOne({ telNo, _id: { $ne: passenger._id } });
      if (existing) return res.status(400).json({ message: 'Telephone number already exists' });
      passenger.telNo = telNo;
    }

    if (fullName) passenger.fullName = fullName;

    await passenger.save();

    return res.json({ message: 'Profile updated successfully', user: passenger });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    const passenger = await Passenger.findById(req.user.id);

    if (!passenger) {
      return res.status(404).json({ message: 'Passenger not found' });
    }

    await Passenger.findByIdAndDelete(req.user.id);
    return res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};