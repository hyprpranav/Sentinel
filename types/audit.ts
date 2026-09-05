// types/audit.ts
import { UserRole } from './user';

export type AuditAction =
  | 'manager_approved'
  | 'manager_rejected'
  | 'manager_activated'
  | 'manager_deactivated'
  | 'worker_approved'
  | 'worker_rejected'
  | 'worker_profile_updated'
  | 'dosimeter_scanned'
  | 'exposure_record_saved'
  | 'calibration_updated'
  | 'admin_settings_changed'
  | 'user_login'
  | 'user_logout';

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  role: UserRole;
  action: AuditAction;
  targetId?: string;
  targetName?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}
