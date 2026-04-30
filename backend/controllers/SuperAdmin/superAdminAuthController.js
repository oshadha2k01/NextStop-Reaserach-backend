const jwt = require('jsonwebtoken');

const FALLBACK_SUPERADMINS = [
  { email: 'superadmin1@nextstop.com', password: 'password@123' },
  { email: 'superadmin2@nextstop.com', password: 'superadmin@123' },
];

const getSuperAdmins = () => {
  try {
    const parsed = JSON.parse(process.env.SUPERADMIN_CREDENTIALS || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return FALLBACK_SUPERADMINS;
  } catch (error) {
    return FALLBACK_SUPERADMINS;
  }
};

const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'your_secret_key';
  return jwt.sign(payload, secret, { expiresIn: '1d' });
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const superAdmins = getSuperAdmins();
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPassword = String(password).trim();

    const matched = superAdmins.find(
      (s) => String(s.email || '').trim().toLowerCase() === normalizedEmail
        && String(s.password || '').trim() === normalizedPassword
    );
    if (!matched) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken({ id: matched.email, email: matched.email, role: 'superadmin' });
    return res.json({ token, email: matched.email });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.profile = async (req, res) => {
  // req.superadmin is set by middleware
  return res.json({ email: req.superadmin.email, role: 'superadmin' });
};
