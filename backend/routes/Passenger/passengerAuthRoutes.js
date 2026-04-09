const express = require('express');
const router = express.Router();
const authController = require('../../controllers/Passenger/passengerAuthController');
const { protect } = require('../../middleware/Passenger/passengerAuthMiddleware');

router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);
router.delete('/profile', protect, authController.deleteProfile);

module.exports = router;
