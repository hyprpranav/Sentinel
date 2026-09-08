// types/worker.ts
export type WorkerStatus = 'active' | 'inactive' | 'suspended';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface Worker {
  id: string;
  publicId: string; // e.g. SNT-W-1042
  uid?: string; // Firebase Auth UID if they have login access
  fullName: string;
  department: string;
  designation: string;
  email?: string;
  phone?: string;
  address?: string;
  bloodGroup?: string;
  dateOfBirth?: string;
  guardianName?: string;
  guardianContact?: string;
  profilePhotoUrl?: string;
  managerId?: string;
  status: WorkerStatus;
  qrCodeData: string; // encoded identifier for QR
  dosimeterStatus: DosimeterStatus;
  lastScanAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkerRequest {
  id: string;
  fullName: string;
  department: string;
  designation: string;
  email?: string;
  phone?: string;
  address?: string;
  bloodGroup?: string;
  dateOfBirth?: string;
  guardianName?: string;
  guardianContact?: string;
  uid?: string;
  profilePhotoUrl?: string;
  status: RequestStatus;
  submittedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
}

export type DosimeterStatus = 'valid' | 'expiring' | 'expired' | 'invalid' | 'not_assigned';
