import type { Role, WorkOrderStatus } from "../models/domain";

export type CreateUserDto = { fullName: string; email: string; password: string; role: Role };
export type UpdateUserDto = { fullName?: string; role?: Role };
export type CreateWorkOrderDto = {
  clientId: string;
  engineBrand: string;
  engineModel: string;
  engineSerial?: string | null;
  serviceType: string;
  description: string;
  estimatedDate?: string | null;
  intakeNotes?: string | null;
  publicNote?: string | null;
  status?: WorkOrderStatus;
};
