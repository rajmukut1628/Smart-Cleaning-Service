import axios from 'axios';
import { useState } from 'react';
import { Star } from 'lucide-react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';

interface ReviewModalProps {
  bookingId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewModal({ bookingId, onClose, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [professionalism, setProfessionalism] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [quality, setQuality] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (comment.trim().length < 10) {
      toast.error('Please write at least 10 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post(
        '/api/reviews/create',
        {
          bookingId,
          rating,
          comment: comment.trim(),
          professionalism: professionalism || rating,
          punctuality: punctuality || rating,
          quality: quality || rating,
        }
      );

      toast.success('Review submitted successfully!');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error('Review submission error:', error);
      toast.error((axios.isAxiosError<{message:string}>(error)?error.response?.data.message:undefined) || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const RatingStars = ({ 
    value, 
    onChange, 
    hover, 
    onHover 
  }: { 
    value: number; 
    onChange: (val: number) => void;
    hover?: number;
    onHover?: (val: number) => void;
  }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => onHover?.(star)}
            onMouseLeave={() => onHover?.(0)}
            className="transition-all hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${
                star <= (hover || value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Write a Review</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Overall Rating */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Rating *
              </label>
              <RatingStars
                value={rating}
                onChange={setRating}
                hover={hoverRating}
                onHover={setHoverRating}
              />
              {rating > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {rating === 5 && 'Excellent!'}
                  {rating === 4 && 'Very Good'}
                  {rating === 3 && 'Good'}
                  {rating === 2 && 'Fair'}
                  {rating === 1 && 'Poor'}
                </p>
              )}
            </div>

            {/* Detailed Ratings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professionalism
                </label>
                <RatingStars value={professionalism} onChange={setProfessionalism} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Punctuality
                </label>
                <RatingStars value={punctuality} onChange={setPunctuality} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality
                </label>
                <RatingStars value={quality} onChange={setQuality} />
              </div>
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review *
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Share your experience with this service... (minimum 10 characters)"
                maxLength={500}
              />
              <p className="text-sm text-gray-500 mt-1">
                {comment.length}/500 characters
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
