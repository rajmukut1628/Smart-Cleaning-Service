import { Request, Response } from 'express';
import { PipelineStage } from 'mongoose';
import Review from '../models/Review';

export async function getReviewGallery(req: Request, res: Response): Promise<void> {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 6);
  const rating = Number(req.query.rating ?? 0);
  const sort = String(req.query.sort ?? 'latest');
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isInteger(limit) || limit < 1 || limit > 12 || !Number.isInteger(rating) || rating < 0 || rating > 5 || !['latest', 'highest', 'lowest'].includes(sort)) {
    res.status(400).json({ message: 'Invalid review page, limit, rating or sort' }); return;
  }
  const filter: PipelineStage.Match[] = rating ? [{ $match: { rating } }] : [];
  const order: Record<string, 1 | -1> = sort === 'highest' ? { rating: -1, createdAt: -1, _id: -1 } : sort === 'lowest' ? { rating: 1, createdAt: -1, _id: -1 } : { createdAt: -1, _id: -1 };
  const [result] = await Review.aggregate([
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'service' } },
    { $unwind: '$service' },
    { $facet: {
      reviews: [...filter, { $sort: order }, { $skip: (page - 1) * limit }, { $limit: limit }, { $project: { _id: 1, 'user.name': 1, 'user.profilePicture': 1, 'service.name': 1, rating: 1, comment: 1, createdAt: 1, professionalism: 1, punctuality: 1, quality: 1 } }],
      matching: [...filter, { $count: 'total' }],
      summary: [{ $group: { _id: null, total: { $sum: 1 }, averageRating: { $avg: '$rating' } } }],
      distribution: [{ $group: { _id: '$rating', count: { $sum: 1 } } }],
    } },
  ]);
  const filteredTotal = result?.matching[0]?.total || 0;
  res.json({ reviews: result?.reviews || [], total: result?.summary[0]?.total || 0, averageRating: result?.summary[0]?.averageRating || 0, distribution: Object.fromEntries((result?.distribution || []).map((row: { _id: number; count: number }) => [row._id, row.count])), filteredTotal, page, pages: Math.max(1, Math.ceil(filteredTotal / limit)) });
}
