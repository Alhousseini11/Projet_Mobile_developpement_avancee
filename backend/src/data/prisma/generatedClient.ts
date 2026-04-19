import path from 'node:path';
import type {
  Prisma as PrismaTypes,
  PrismaClient as GeneratedPrismaClientClass,
  ReservationStatus as GeneratedReservationStatus,
  Role as GeneratedRole,
  TutorialCategory as GeneratedTutorialCategory,
  TutorialDifficulty as GeneratedTutorialDifficulty,
  User as GeneratedUser
} from '../../../node_modules/@prisma/client/.prisma/client';

type GeneratedPrismaClientModule = typeof import('../../../node_modules/@prisma/client/.prisma/client');

const generatedPrismaClient = require(
  path.resolve(process.cwd(), 'node_modules', '@prisma', 'client', '.prisma', 'client', 'default.js')
) as GeneratedPrismaClientModule;

export type * from '../../../node_modules/@prisma/client/.prisma/client';

export type PrismaClient = GeneratedPrismaClientClass;
export type User = GeneratedUser;
export type Role = GeneratedRole;
export type ReservationStatus = GeneratedReservationStatus;
export type TutorialCategory = GeneratedTutorialCategory;
export type TutorialDifficulty = GeneratedTutorialDifficulty;

export namespace Prisma {
  export type Decimal = PrismaTypes.Decimal;
  export type PrismaClientKnownRequestError = PrismaTypes.PrismaClientKnownRequestError;
  export type PrismaClientValidationError = PrismaTypes.PrismaClientValidationError;
  export type UserUpdateInput = PrismaTypes.UserUpdateInput;
  export type UserProfileSettingsUncheckedUpdateInput = PrismaTypes.UserProfileSettingsUncheckedUpdateInput;
  export type UserProfileSettingsUncheckedCreateInput = PrismaTypes.UserProfileSettingsUncheckedCreateInput;
  export type TutorialCreateInput = PrismaTypes.TutorialCreateInput;
  export type TutorialUpdateInput = PrismaTypes.TutorialUpdateInput;
}

export const PrismaClient: typeof generatedPrismaClient.PrismaClient = generatedPrismaClient.PrismaClient;
export const Prisma: typeof generatedPrismaClient.Prisma = generatedPrismaClient.Prisma;
export const Role: typeof generatedPrismaClient.Role = generatedPrismaClient.Role;
export const ReservationStatus: typeof generatedPrismaClient.ReservationStatus =
  generatedPrismaClient.ReservationStatus;
export const TutorialCategory: typeof generatedPrismaClient.TutorialCategory =
  generatedPrismaClient.TutorialCategory;
export const TutorialDifficulty: typeof generatedPrismaClient.TutorialDifficulty =
  generatedPrismaClient.TutorialDifficulty;
