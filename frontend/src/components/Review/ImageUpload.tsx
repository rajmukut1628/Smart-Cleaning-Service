import axios from 'axios';
import { imageUrl } from '../../utils/imageUrl';
import { useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  bookingId: string;
  type: 'before' | 'after';
  existingImages?: string[];
  onSuccess: (images?: string[]) => void;
  onClose: () => void;
}

export default function ImageUpload({
  bookingId,
  type,
  existingImages = [],
  onSuccess,
  onClose
}: ImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length + previews.length > 5) {
      toast.error('You can upload maximum 5 images');
      return;
    }

    // Create previews
    const newPreviews: string[] = [];
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === files.length) {
            setPreviews([...previews, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      }
    });

    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeImage = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      // Upload each file
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await api.post(
          '/api/upload',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        uploadedUrls.push(data.filePath);
      }

      // Save image URLs to booking
      const endpoint = type === 'before'
        ? `/api/bookings/${bookingId}/before-images`
        : `/api/bookings/${bookingId}/after-images`;

      await api.post(
        endpoint,
        { images: [...existingImages, ...uploadedUrls] }
      );

      toast.success(`${type === 'before' ? 'Before' : 'After'} images uploaded successfully!`);
      onSuccess([...existingImages, ...uploadedUrls]);
      onClose();
    } catch (error: unknown) {
      console.error('Upload error:', error);
      toast.error((axios.isAxiosError<{message:string}>(error)?error.response?.data.message:undefined) || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Upload {type === 'before' ? 'Before' : 'After'} Images
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Current Images</h3>
              <div className="grid grid-cols-3 gap-4">
                {existingImages.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl(url)}
                      alt={`Existing ${type} ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select New Images (Max 10 total)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="image-upload"
                disabled={uploading}
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Click to upload images</p>
                <p className="text-sm text-gray-500 mt-1">PNG, JPG, JPEG up to 10MB each</p>
              </label>
            </div>
          </div>

          {/* Preview Selected Images */}
          {previews.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Images</h3>
              <div className="grid grid-cols-3 gap-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <ImageIcon className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Image Upload Tips:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Capture clear, well-lit photos</li>
                  <li>Show multiple angles of the cleaned area</li>
                  <li>Include before and after shots for best comparison</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Images
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
