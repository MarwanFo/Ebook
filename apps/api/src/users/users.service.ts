import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PasswordHasherService } from '../auth/services/password-hasher.service';
import { validatePasswordPolicy } from '../auth/utils/password-validator';
import { UserProfileDto, UserRole as SharedUserRole } from '@bookflow/shared-types';

export interface CreateUserData {
  email: string;
  passwordPlain: string;
  displayName?: string;
  role?: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasherService,
  ) {}

  /**
   * Normalizes email address (lowercase + trimmed).
   */
  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Formats a Prisma User record into a safe, client-facing UserProfileDto.
   */
  toProfileDto(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role as unknown as SharedUserRole,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = this.normalizeEmail(email);
    return this.prisma.user.findUnique({
      where: { email: normalized },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async getProfileById(id: string): Promise<UserProfileDto> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User profile not found.');
    }
    return this.toProfileDto(user);
  }

  async create(data: CreateUserData): Promise<User> {
    const normalizedEmail = this.normalizeEmail(data.email);

    // Validate password policy before hashing
    validatePasswordPolicy(data.passwordPlain);

    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const passwordHash = await this.passwordHasher.hash(data.passwordPlain);
    const emailPrefix = normalizedEmail.split('@')[0] || 'reader';
    const displayName: string = data.displayName?.trim() || emailPrefix;

    return this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        displayName,
        role: data.role || UserRole.USER,
      },
    });
  }

  async updatePassword(userId: string, newPasswordPlain: string): Promise<void> {
    validatePasswordPolicy(newPasswordPlain);
    const passwordHash = await this.passwordHasher.hash(newPasswordPlain);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async updateProfile(
    userId: string,
    data: { displayName?: string; avatarUrl?: string | null },
  ): Promise<UserProfileDto> {
    const updateData: { displayName?: string; avatarUrl?: string | null } = {};
    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName.trim();
    }
    if (data.avatarUrl !== undefined) {
      updateData.avatarUrl = data.avatarUrl;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    return this.toProfileDto(user);
  }
}
