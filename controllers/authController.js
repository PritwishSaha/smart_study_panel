import User from '../models/User.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from '../middleware/asyncHandler.js';
import twilio from 'twilio';

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Store verification codes in memory (use Redis in production)
const verificationCodes = new Map();

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, phone, verificationCode } = req.body;

  // Validate phone number format if provided
  if (phone) {
    const phoneRegex = /^\+?[1-9]\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;
    if (!phoneRegex.test(phone)) {
      return next(new ErrorResponse('Please provide a valid phone number with country code (e.g., +1 234 567 8900)', 400));
    }
  }

  // Check if phone number already exists
  if (phone) {
    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      return next(new ErrorResponse('Phone number is already in use', 400));
    }
  }

  // Check if phone is verified
  if (phone) {
    const storedCode = verificationCodes.get(phone);
    if (!storedCode?.verified || storedCode.expiresAt < Date.now()) {
      return next(new ErrorResponse('Phone number not verified', 400));
    }
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role,
    phone,
    isPhoneVerified: phone ? true : false // Add this field to your User model
  });

  // Clean up verification code
  if (phone) {
    verificationCodes.delete(phone);
  }

  sendTokenResponse(user, 200, res);
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  // Check for user
  const user = await User.findOne({ where: { email } });

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  sendTokenResponse(user, 200, res);
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password'] }
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
export const updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email
  };

  const user = await User.findByPk(req.user.id);
  
  // Update user
  await user.update(fieldsToUpdate);

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
export const updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.user.id);

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Send verification code to phone
// @route   POST /api/v1/auth/send-verification
// @access  Public
export const sendVerificationCode = asyncHandler(async (req, res, next) => {
  const { phone } = req.body;

  if (!phone) {
    return next(new ErrorResponse('Phone number is required', 400));
  }

  // Generate 6-digit code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  try {
    // In production, use Twilio to send SMS
    if (process.env.NODE_ENV === 'production') {
      await twilioClient.messages.create({
        body: `Your verification code is: ${verificationCode}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
    } else {
      // In development, log the code to console
      console.log(`Verification code for ${phone}: ${verificationCode}`);
    }

    // Store code with expiration (10 minutes)
    verificationCodes.set(phone, {
      code: verificationCode,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    res.status(200).json({
      success: true,
      message: 'Verification code sent',
      // In development, include the code for testing
      ...(process.env.NODE_ENV !== 'production' && { testCode: verificationCode })
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    return next(new ErrorResponse('Failed to send verification code', 500));
  }
});

// @desc    Verify phone number
// @route   POST /api/v1/auth/verify-phone
// @access  Public
export const verifyPhoneNumber = asyncHandler(async (req, res, next) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return next(new ErrorResponse('Phone number and code are required', 400));
  }

  const storedCode = verificationCodes.get(phone);
  
  // Check if code exists and not expired
  if (!storedCode || storedCode.expiresAt < Date.now()) {
    return next(new ErrorResponse('Invalid or expired verification code', 400));
  }

  // Verify code
  if (storedCode.code !== code) {
    return next(new ErrorResponse('Invalid verification code', 400));
  }

  // Mark phone as verified (in a real app, you might store this in the database)
  verificationCodes.set(phone, { ...storedCode, verified: true });

  res.status(200).json({
    success: true,
    message: 'Phone number verified successfully'
  });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token
    });
};
