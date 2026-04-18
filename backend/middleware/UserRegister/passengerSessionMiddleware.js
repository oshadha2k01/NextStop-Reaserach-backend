const jwt = require('jsonwebtoken');
const Passenger = require('../../models/UserRegister/Passenger');

exports.protectPassengerSession = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'your_secret_key';
    const decoded = jwt.verify(token, secret);
    const passenger = await Passenger.findById(decoded.id);

    if (!passenger) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!passenger.authExpiresAt || passenger.authExpiresAt.getTime() <= Date.now()) {
      return res.status(401).json({ message: 'Session expired. Please register again.' });
    }

    req.user = passenger;
    req.tokenPayload = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};