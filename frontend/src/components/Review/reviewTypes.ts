export interface CustomerReview {
  _id: string;
  user: { name: string; profilePicture?: string } | null;
  service: { name: string } | null;
  rating: number;
  comment: string;
  createdAt: string;
  professionalism?: number;
  punctuality?: number;
  quality?: number;
}

export interface ReviewGalleryData {
  reviews: CustomerReview[];
  total: number;
  averageRating: number;
  distribution: Record<string, number>;
  filteredTotal: number;
  page: number;
  pages: number;
}
