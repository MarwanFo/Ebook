import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CookieService } from './services/cookie.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { AuthSessionDto, AuthTokensDto, MessageResponseDto, UserProfileDto } from '@bookflow/shared-types';
export declare class AuthController {
    private readonly authService;
    private readonly cookieService;
    constructor(authService: AuthService, cookieService: CookieService);
    register(dto: RegisterDto, ip: string, req: Request, res: Response): Promise<AuthSessionDto>;
    login(dto: LoginDto, ip: string, req: Request, res: Response): Promise<AuthSessionDto>;
    refresh(req: Request, res: Response, ip: string): Promise<AuthTokensDto>;
    logout(req: Request, res: Response): Promise<MessageResponseDto>;
    getMe(user: UserProfileDto): Promise<{
        user: UserProfileDto;
    }>;
    changePassword(userId: string, dto: ChangePasswordDto, res: Response): Promise<MessageResponseDto>;
    forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponseDto>;
    resetPassword(dto: ResetPasswordDto, res: Response): Promise<MessageResponseDto>;
    verifyEmail(dto: VerifyEmailDto): Promise<MessageResponseDto>;
    resendVerification(dto: ResendVerificationDto): Promise<MessageResponseDto>;
}
//# sourceMappingURL=auth.controller.d.ts.map