// types/user.ts
export type UserRole = 'admin' | 'manager' | 'worker';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  profilePhotoUrl?: string;
  publicId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ManagerRequest {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  department?: string;
  profilePhotoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
}
