export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'worker' | 'admin' | 'superadmin' | 'blocked';
  avatar?: string;
  profilePicture?: string;
  address?: string;
  isOnline?: boolean;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  pricePerSqFt: number;
  pricePerUnit: number;
  unitConfig?: string|{_id:string;unitType:string;label:string;options?:{label:string;value:number}[];allowCustom?:boolean;customPlaceholder?:string}|null;
  duration: number;
  image: string;
  features: string[];
}

export interface Booking {
  id: string;
  userId: string;
  serviceId: string;
  serviceName?: string; // Added for admin view
  workerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  squareFootage: number;
  scheduledDate: string;
  scheduledTime: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  specialInstructions?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Worker {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  rating: number;
  totalJobs: number;
  completedJobs: number;
  earnings: number;
  isAvailable: boolean;
  location?: {
    lat: number;
    lng: number;
  };
  specialties: string[];
  joinedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
  isRead: boolean;
}

export interface Review {
  id: string;
  bookingId: string;
  userId: string;
  workerId: string;
  rating: number;
  comment: string;
  createdAt: string;
}