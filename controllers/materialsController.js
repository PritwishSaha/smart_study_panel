import Material from '../models/Material.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/User.js';
import path from 'path';
import fs from 'fs';

// @desc    Get all materials
// @route   GET /api/v1/materials
// @access  Public
export const getMaterials = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single material
// @route   GET /api/v1/materials/:id
// @access  Public
export const getMaterial = asyncHandler(async (req, res, next) => {
  const material = await Material.findByPk(req.params.id, {
    include: [
      {
        model: User,
        attributes: ['id', 'name']
      }
    ]
  });

  if (!material) {
    return next(
      new ErrorResponse(`Material not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: material
  });
});

// @desc    Create new material
// @route   POST /api/v1/materials
// @access  Private
export const createMaterial = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.userId = req.user.id;

  const material = await Material.create(req.body);

  res.status(201).json({
    success: true,
    data: material
  });
});

// @desc    Update material
// @route   PUT /api/v1/materials/:id
// @access  Private
export const updateMaterial = asyncHandler(async (req, res, next) => {
  let material = await Material.findByPk(req.params.id);

  if (!material) {
    return next(
      new ErrorResponse(`Material not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is material owner or admin
  if (material.userId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this material`,
        401
      )
    );
  }

  material = await material.update(req.body);

  res.status(200).json({
    success: true,
    data: material
  });
});

// @desc    Delete material
// @route   DELETE /api/v1/materials/:id
// @access  Private
export const deleteMaterial = asyncHandler(async (req, res, next) => {
  const material = await Material.findByPk(req.params.id);

  if (!material) {
    return next(
      new ErrorResponse(`Material not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is material owner or admin
  if (material.userId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this material`,
        401
      )
    );
  }

  await material.destroy();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Upload file for material
// @route   PUT /api/v1/materials/:id/file
// @access  Private
export const materialFileUpload = asyncHandler(async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new ErrorResponse('No files were uploaded', 400));
  }

  const file = req.files.file;
  const material = await Material.findByPk(req.params.id);

  if (!material) {
    return next(
      new ErrorResponse(`Material not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is material owner or admin
  if (material.userId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this material`,
        401
      )
    );
  }

  // Check if file exists
  if (!file) {
    return next(new ErrorResponse('Please upload a file', 400));
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return next(new ErrorResponse('File size should be less than 10MB', 400));
  }

  // Create uploads directory if it doesn't exist
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Create custom filename
  const fileExt = path.extname(file.name);
  const filename = `material_${material.id}_${Date.now()}${fileExt}`;
  const filePath = path.join(uploadDir, filename);
  const fileUrl = `/uploads/${filename}`;

  try {
    // Move file to uploads directory
    await file.mv(filePath);

    // Update material with file info
    await material.update({
      filePath: fileUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.mimetype
    });

    res.status(200).json({
      success: true,
      data: {
        filePath: fileUrl,
        fileName: file.name,
        fileType: file.mimetype,
        fileSize: file.size
      }
    });
  } catch (err) {
    console.error('File upload error:', err);
    return next(new ErrorResponse('Problem with file upload', 500));
  }
});
