export enum Role {
  PARENT = 'PARENT',
  BABY_SITTER = 'BABY_SITTER',
  ADMIN = 'ADMIN',
  VISITOR = 'VISITOR',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum NotificationType {
  NEW_BOOKING = 'NEW_BOOKING',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_DECLINED = 'BOOKING_DECLINED',
  NEW_REVIEW = 'NEW_REVIEW',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photo?: string;
  role: Role;
  createdAt: string; // ISO String
  isVerified: boolean;
}

export interface Parent extends User {
  address: string;
  nbChildren: number;
}

export interface BabySitter extends User {
  experience: string;
  hourlyRate: number;
  availabilities: string[]; // ISO strings
  averageRating: number;
  location: string;
  isValidated: boolean;
  identityVerified: boolean;
}

export interface IdentityDocument {
  id: number;
  documentType: string;
  documentNumber: string;
  photoFront: string;
  photoBack: string;
  uploadedAt: string;
  verifiedAt?: string;
  status: DocumentStatus;
  verifiedBy?: number; 
}

export interface Review {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  parentId: number; 
  babySitterId: number;
}

export interface Booking {
  id: number;
  startDate: string;
  endDate: string;
  duration: number;
  totalPrice: number;
  status: BookingStatus;
  createdAt: string;
  parentId: number;
  babySitterId: number;
}

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  isRead: boolean;
  sentAt: string;
  userId: number;
}
