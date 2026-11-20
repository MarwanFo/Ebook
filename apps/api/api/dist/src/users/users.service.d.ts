import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PasswordHasherService } from '../auth/services/password-hasher.service';
import { UserProfileDto } from '@bookflow/shared-types';
export interface CreateUserData {
    email: string;
    passwordPlain: string;
    displayName?: string;
    role?: UserRole;
}
export declare class UsersService {
    private readonly prisma;
    private readonly passwordHasher;
    constructor(prisma: PrismaService, passwordHasher: PasswordHasherService);
    /**
     * Normalizes email address (lowercase + trimmed).
     */
    normalizeEmail(email: string): string;
    /**
     * Formats a Prisma User record into a safe, client-facing UserProfileDto.
     */
    toProfileDto(user: User): UserProfileDto;
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    getProfileById(id: string): Promise<UserProfileDto>;
    create(data: CreateUserData): Promise<User>;
    updatePassword(userId: string, newPasswordPlain: string): Promise<void>;
    updateProfile(userId: string, data: {
        displayName?: string;
        avatarUrl?: string | null;
    }): Promise<UserProfileDto>;
}
//# sourceMappingURL=users.service.d.ts.map