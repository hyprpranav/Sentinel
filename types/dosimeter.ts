// types/dosimeter.ts
import { DosimeterStatus } from './worker';

export interface Dosimeter {
  id: string;
  cartridgeId: string;
  workerId?: string;
  manufactureDate: Date;
  activationDate?: Date;
  expiryDate: Date;
  status: DosimeterStatus;
  batchNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
