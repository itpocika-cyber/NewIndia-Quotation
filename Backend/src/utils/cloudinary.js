import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload an image buffer to Cloudinary under folder 'pocika/quotation-products'.
 * Returns { url: secure_url, publicId: public_id }
 */
export async function uploadToCloudinary(buffer, originalname = 'product') {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials not configured in environment (.env).');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'pocika/quotation-products',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id
        });
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Destroy image asset in Cloudinary when replaced or deleted.
 */
export async function deleteFromCloudinary(publicId) {
  if (!publicId) return;
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.warn('[Cloudinary Warning] Cannot delete asset; Cloudinary credentials not configured.');
    return;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (err) {
    console.error(`[Cloudinary Error] Failed to delete asset ${publicId}:`, err.message);
  }
}

export default cloudinary;
