import { User } from '../entities/User';

export interface IUserRepo {
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
}
