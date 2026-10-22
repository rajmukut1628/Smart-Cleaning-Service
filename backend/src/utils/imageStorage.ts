import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { createHash, randomUUID } from 'crypto';
import https from 'https';

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (/^\.(jpe?g|png|gif|webp|bmp)$/i.test(path.extname(file.originalname)) && /^image\/(jpeg|jpg|png|gif|webp|bmp)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});
export class ImageStorageError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
// Read configuration after dotenv has loaded, rather than during route imports.
export async function storeImage(file: Express.Multer.File): Promise<string> {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud_name && !api_key && !api_secret && process.env.NODE_ENV !== 'production' && !process.env.RENDER) {
    const filename = `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
    await fs.mkdir(path.resolve('uploads'), { recursive: true });
    await fs.writeFile(path.resolve('uploads', filename), file.buffer);
    return `/uploads/${filename}`;
  }
  if (!cloud_name || !api_key || !api_secret) throw new ImageStorageError(503, 'Image storage is not configured. Set all three Cloudinary environment variables on the backend.');
  if (!/^[a-zA-Z0-9_-]+$/.test(cloud_name)) throw new ImageStorageError(503, 'Cloudinary cloud name is invalid.');
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = randomUUID();
  const folder = 'smart-cleaning-service';
  const signature = createHash('sha1').update(`folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${api_secret}`).digest('hex');
  const boundary = `----SmartCleaning${randomUUID().replace(/-/g, '')}`;
  const fields: Record<string, string> = { api_key, folder, public_id: publicId, timestamp: String(timestamp), signature };
  const parts: Uint8Array[] = Object.entries(fields).map(([key, value]) => Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(file.originalname).replace(/["\r\n]/g, '')}"\r\nContent-Type: ${file.mimetype}\r\n\r\n`));
  parts.push(file.buffer, Buffer.from(`\r\n--${boundary}--\r\n`));
  const body = Buffer.concat(parts);
  return new Promise((resolve, reject) => {
    const request = https.request({ hostname: 'api.cloudinary.com', path: `/v1_1/${encodeURIComponent(cloud_name)}/image/upload`, method: 'POST', headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length }, timeout: 60000 }, response => {
      const chunks: Buffer[] = [];
      response.on('data', chunk => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        let result: any;
        try { result = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { /* malformed provider response */ }
        if ((response.statusCode || 500) >= 200 && (response.statusCode || 500) < 300 && typeof result?.secure_url === 'string') resolve(result.secure_url);
        else {
          // Keep provider error details in server logs; never return credentials to the client.
          console.error('Cloudinary image upload rejected:', response.statusCode, result?.error?.message || 'provider error');
          reject(new ImageStorageError(502, 'Image upload failed. Please retry or check the backend Cloudinary credentials.'));
        }
      });
    });
    request.on('timeout', () => request.destroy(new Error('Cloudinary request timed out')));
    request.on('error', () => reject(new ImageStorageError(502, 'Image upload failed. Please retry.')));
    request.end(body);
  });
}
export function isUploadedImage(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (/^\/uploads\/[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.(jpe?g|png|gif|webp|bmp)$/i.test(value)) return true;
  try {
    const url = new URL(value);
    const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    return Boolean(cloud && url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && !url.search && !url.hash &&
      url.pathname.startsWith(`/${cloud}/image/upload/`) && /\/smart-cleaning-service\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(url.pathname));
  } catch { return false; }
}
