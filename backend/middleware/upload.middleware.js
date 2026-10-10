const multer = require('multer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed.'), false);
    }
  }
});

function cloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

const uploadToCloudinary = async (fileBuffer, mimetype) => {
  if (!cloudinaryConfigured()) {
    const error = new Error('Image uploads are unavailable until Cloudinary is configured.');
    error.code = 'CLOUDINARY_UNAVAILABLE';
    throw error;
  }
  return new Promise((resolve, reject) => {
    const b64 = Buffer.from(fileBuffer).toString('base64');
    let dataURI = "data:" + mimetype + ";base64," + b64;
    cloudinary.uploader.upload(dataURI, { folder: 'campusfix' }, (error, result) => {
      if (error) return reject(error);
      resolve({ url: result.secure_url, publicId: result.public_id });
    });
  });
};

const deleteFromCloudinary = async (publicId) => {
  if (!publicId || !cloudinaryConfigured()) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
};

module.exports = { ALLOWED_IMAGE_TYPES, cloudinaryConfigured, deleteFromCloudinary, upload, uploadToCloudinary };
