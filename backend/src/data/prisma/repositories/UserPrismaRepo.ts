import { IUserRepo } from '../../domain/repositories/IUserRepo';
import { User } from '../../domain/entities/User';
import { prisma } from '../client';

export class UserPrismaRepo implements IUserRepo {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } }) as unknown as User;
  }
  async create(user: User): Promise<User> {
    return prisma.user.create({ data: user }) as unknown as User;
  }
}
