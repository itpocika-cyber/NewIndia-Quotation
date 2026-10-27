import express from 'express';
import { Product } from '../models/Product.js';
import { Sequence } from '../models/Sequence.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { handleProductImageUpload } from '../middleware/upload.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

const router = express.Router();
router.use(authenticate);

// GET /api/v1/products
router.get('/', async (req, res, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: products
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/products
 * Accepts JSON or multipart/form-data with image file
 */
router.post('/', handleProductImageUpload, async (req, res, next) => {
  try {
    const {
      name,
      make,
      description,
      category,
      unit,
      rate,
      gstRate,
      hsnCode,
      status
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Product name is required.'
      });
    }

    let imageUrl = '';
    let imagePublicId = '';

    // If an image file was uploaded, stream to Cloudinary
    if (req.file) {
      try {
        const uploadRes = await uploadToCloudinary(req.file.buffer, req.file.originalname);
        imageUrl = uploadRes.url;
        imagePublicId = uploadRes.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary upload failed during product creation:', uploadErr.message);
        // We will continue saving the product without the image to avoid blocking the user
      }
    }

    // Atomic sequence allocation with retry for product ID (PRD-0001)
    let nextId;
    let isUnique = false;
    while (!isUnique) {
      nextId = await Sequence.getNext('product', 'PRD-', 4);
      const exists = await Product.findOne({ id: nextId });
      if (!exists) {
        isUnique = true;
      }
    }

    const newProduct = new Product({
      id: nextId,
      name: name.trim(),
      make: make?.trim() || 'POCIKA',
      description: description?.trim() || '',
      category: category?.trim() || 'Fire Protection Equipment',
      unit: unit?.trim() || 'Nos',
      rate: parseFloat(rate) || 0,
      gstRate: parseFloat(gstRate) || 0,
      hsnCode: hsnCode?.trim() || '',
      status: status || 'Active',
      imageUrl,
      imagePublicId
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      data: newProduct
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT / PATCH /api/v1/products/:id
 * Accepts JSON or multipart/form-data with image file
 */
const updateProductHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    delete updateData.id;
    delete updateData._id;

    if (updateData.rate !== undefined) updateData.rate = parseFloat(updateData.rate) || 0;
    if (updateData.gstRate !== undefined) updateData.gstRate = parseFloat(updateData.gstRate) || 0;
    if (updateData.make) updateData.make = updateData.make.trim();

    const existingProduct = await Product.findOne({ id });
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        error: `Product with ID '${id}' not found.`
      });
    }

    // If a new image was uploaded:
    if (req.file) {
      try {
        // 1. Destroy old asset in Cloudinary first if it exists
        if (existingProduct.imagePublicId) {
          await deleteFromCloudinary(existingProduct.imagePublicId).catch(() => {});
        }

        // 2. Upload new image
        const uploadRes = await uploadToCloudinary(req.file.buffer, req.file.originalname);
        updateData.imageUrl = uploadRes.url;
        updateData.imagePublicId = uploadRes.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary upload failed during product update:', uploadErr.message);
        // Continue updating product details even if image upload fails
      }
    } else if (req.body.removeImage === 'true') {
      // If user explicitly removed existing image
      if (existingProduct.imagePublicId) {
        await deleteFromCloudinary(existingProduct.imagePublicId).catch(() => {});
      }
      updateData.imageUrl = '';
      updateData.imagePublicId = '';
    }

    const updated = await Product.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

router.put('/:id', handleProductImageUpload, updateProductHandler);
router.patch('/:id', handleProductImageUpload, updateProductHandler);

// DELETE /api/v1/products/:id
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ id });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: `Product with ID '${id}' not found.`
      });
    }

    // Destroy Cloudinary image asset first if exists
    if (product.imagePublicId) {
      await deleteFromCloudinary(product.imagePublicId);
    }

    await Product.findOneAndDelete({ id });

    res.json({
      success: true,
      message: `Product ${id} deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
