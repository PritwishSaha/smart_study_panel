import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  materialFileUpload
} from '../controllers/materialsController.js';

const router = express.Router();

// Public routes
router.route('/')
  .get(getMaterials);

router.route('/:id')
  .get(getMaterial);

// Protected routes (require authentication)
router.use(protect);

// File upload route (protected and requires publisher/admin role)
router.route('/:id/file')
  .put(authorize('publisher', 'admin'), materialFileUpload);

// Admin/Publisher routes
router.use(authorize('publisher', 'admin'));

router.route('/')
  .post(createMaterial);

router.route('/:id')
  .put(updateMaterial)
  .delete(deleteMaterial);

export default router;
