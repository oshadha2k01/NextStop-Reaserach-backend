const express = require('express');
const router = express.Router();
const userRegisterController = require('../../controllers/UserRegister/userRegisterController');
const { protectPassengerSession } = require('../../middleware/UserRegister/passengerSessionMiddleware');

// Step 1: registration details and send OTP to email
router.post('/register', userRegisterController.registerAndSendOtp);

// Step 2: verify 6-digit OTP and create passenger account
router.post('/verify-otp', userRegisterController.verifyOtpAndCreateUser);

// Step 3: resend OTP with cooldown protection
router.post('/resend-otp', userRegisterController.resendOtp);

// Check whether the stored OTP session is still valid after app restart
router.get('/session', protectPassengerSession, userRegisterController.checkSession);

module.exports = router;
