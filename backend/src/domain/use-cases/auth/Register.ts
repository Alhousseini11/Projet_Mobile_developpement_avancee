import { IUserRepo } from '../../repositories/IUserRepo';

export class Register {
  constructor(private readonly userRepo: IUserRepo) {}
  async execute(): Promise<void> {
    // TODO: implement
  }
}
