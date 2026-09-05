// types/user.ts
export type UserRole = 'admin' | 'manager' | 'worker';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  profilePhotoUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
