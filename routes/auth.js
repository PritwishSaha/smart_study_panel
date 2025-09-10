import express from 'express';
import { 
  register, 
  login, 
  getMe, 
  forgotPassword, 
  resetPassword, 
  updateDetails, 
  updatePassword,
  logout,
  sendVerificationCode,
  verifyPhoneNumber
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.post('/send-verification', sendVerificationCode);
router.post('/verify-phone', verifyPhoneNumber);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.get('/logout', logout);

export default router;
