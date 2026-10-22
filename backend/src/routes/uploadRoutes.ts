import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { imageUpload, storeImage, ImageStorageError } from '../utils/imageStorage';
const router = express.Router();
router.post('/', protect, imageUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please upload an image' });
  try {
    const filePath = await storeImage(req.file);
    res.json({ message: 'Image uploaded successfully', filePath });
  } catch (error) {
    res.status(error instanceof ImageStorageError ? error.status : 500).json({ message: error instanceof ImageStorageError ? error.message : 'Failed to upload image' });
  }
});
export default router;
