const jwt = require('jsonwebtoken');

exports.protectDriver = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'your_secret_key';
    const decoded = jwt.verify(token, secret);

    if (decoded.role !== 'driver') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    req.driver = {
      id: decoded.id,
      busId: decoded.busId,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
