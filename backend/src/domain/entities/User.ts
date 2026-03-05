import { Role } from '@prisma/client';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
}
