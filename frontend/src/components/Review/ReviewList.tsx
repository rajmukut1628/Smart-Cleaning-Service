import { Star } from 'lucide-react';

interface Review {
  _id: string;
  rating: number;
  comment: string;
  professionalism?: number;
  punctuality?: number;
  quality?: number;
  user: {
    name: string;
    email: string;
  };
  service?: {
    name: string;
  };
  createdAt: string;
}

interface ReviewListProps {
  reviews: Review[];
  stats?: {
    totalReviews: number;
    averageRating: number;
    averageProfessionalism: number;
    averagePunctuality: number;
    averageQuality: number;
  };
}

export default function ReviewList({ reviews, stats }: ReviewListProps) {
  const RatingStars = ({ rating }: { rating: number }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Stats Section */}
      {stats && stats.totalReviews > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-50 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.averageRating}</div>
              <div className="text-sm text-gray-600">Overall</div>
              <RatingStars rating={Math.round(stats.averageRating)} />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalReviews}</div>
              <div className="text-sm text-gray-600">Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-700">{stats.averageProfessionalism}</div>
              <div className="text-sm text-gray-600">Professional</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-700">{stats.averagePunctuality}</div>
              <div className="text-sm text-gray-600">Punctual</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-700">{stats.averageQuality}</div>
              <div className="text-sm text-gray-600">Quality</div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No reviews yet</p>
            <p className="text-gray-400 text-sm mt-2">Be the first to leave a review!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-blue-600">
                      {review.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{review.user.name}</h4>
                    <p className="text-sm text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <RatingStars rating={review.rating} />
                  {review.service && (
                    <span className="text-xs text-gray-500">{review.service.name}</span>
                  )}
                </div>
              </div>

              <p className="text-gray-700 mb-3">{review.comment}</p>

              {/* Detailed Ratings */}
              {(review.professionalism || review.punctuality || review.quality) && (
                <div className="flex gap-4 text-sm border-t pt-3">
                  {review.professionalism && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Professionalism:</span>
                      <span className="font-semibold text-blue-600">{review.professionalism}/5</span>
                    </div>
                  )}
                  {review.punctuality && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Punctuality:</span>
                      <span className="font-semibold text-blue-600">{review.punctuality}/5</span>
                    </div>
                  )}
                  {review.quality && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Quality:</span>
                      <span className="font-semibold text-blue-600">{review.quality}/5</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
