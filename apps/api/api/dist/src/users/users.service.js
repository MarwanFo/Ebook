"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../database/prisma.service");
const password_hasher_service_1 = require("../auth/services/password-hasher.service");
const password_validator_1 = require("../auth/utils/password-validator");
let UsersService = class UsersService {
    prisma;
    passwordHasher;
    constructor(prisma, passwordHasher) {
        this.prisma = prisma;
        this.passwordHasher = passwordHasher;
    }
    /**
     * Normalizes email address (lowercase + trimmed).
     */
    normalizeEmail(email) {
        return email.trim().toLowerCase();
    }
    /**
     * Formats a Prisma User record into a safe, client-facing UserProfileDto.
     */
    toProfileDto(user) {
        return {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };
    }
    async findByEmail(email) {
        const normalized = this.normalizeEmail(email);
        return this.prisma.user.findUnique({
            where: { email: normalized },
        });
    }
    async findById(id) {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }
    async getProfileById(id) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException('User profile not found.');
        }
        return this.toProfileDto(user);
    }
    async create(data) {
        const normalizedEmail = this.normalizeEmail(data.email);
        // Validate password policy before hashing
        (0, password_validator_1.validatePasswordPolicy)(data.passwordPlain);
        const existing = await this.findByEmail(normalizedEmail);
        if (existing) {
            // Timing defense: equalize execution latency via Argon2id hashing before rejecting
            await this.passwordHasher.hash(data.passwordPlain);
            throw new common_1.ConflictException('An account with this email address already exists.');
        }
        const passwordHash = await this.passwordHasher.hash(data.passwordPlain);
        const emailPrefix = normalizedEmail.split('@')[0] || 'reader';
        const displayName = data.displayName?.trim() || emailPrefix;
        return this.prisma.user.create({
            data: {
                email: normalizedEmail,
                passwordHash,
                displayName,
                role: data.role || client_1.UserRole.USER,
            },
        });
    }
    async updatePassword(userId, newPasswordPlain) {
        (0, password_validator_1.validatePasswordPolicy)(newPasswordPlain);
        const passwordHash = await this.passwordHasher.hash(newPasswordPlain);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });
    }
    async updateProfile(userId, data) {
        const updateData = {};
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
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        password_hasher_service_1.PasswordHasherService])
], UsersService);
