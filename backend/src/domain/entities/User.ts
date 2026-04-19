import { Role } from '../../data/prisma/generatedClient';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
}
