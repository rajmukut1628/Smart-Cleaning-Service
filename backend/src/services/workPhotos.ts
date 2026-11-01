import { isUploadedImage, uploadedImageExists } from '../utils/imageStorage';
export function workPhotoRequirement(booking: { beforeImages?: unknown[]; afterImages?: unknown[] }, target: string): string | null {
  const before = booking.beforeImages?.some(isUploadedImage), after = booking.afterImages?.some(isUploadedImage);
  if (target === 'in-progress' && !before) return 'Upload at least one before photo before starting this job.';
  if (target === 'completed' && (!before || !after)) return 'Upload at least one before photo and one after photo before completing this job.';
  return null;
}

export async function verifiedWorkPhotoRequirement(booking: {beforeImages?: unknown[];afterImages?: unknown[]},target:string):Promise<string|null>{
 const structural=workPhotoRequirement(booking,target);
 if(structural||!['in-progress','completed'].includes(target))return structural;
 const before=(await Promise.all((booking.beforeImages||[]).map(uploadedImageExists))).some(Boolean);
 const after=target!=='completed'||(await Promise.all((booking.afterImages||[]).map(uploadedImageExists))).some(Boolean);
 return before&&after?null:'Your job photos could not be verified in image storage. Upload the required photos again and retry.';
}
