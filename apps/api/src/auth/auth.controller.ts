import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CookieService } from './services/cookie.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { CsrfOriginGuard } from './guards/csrf-origin.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  AuthSessionDto,
  AuthTokensDto,
  MessageResponseDto,
  UserProfileDto,
} from '@bookflow/shared-types';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  async register(
    @Body() dto: RegisterDto,
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionDto> {
    const userAgent = req.headers['user-agent'];
    const { session, rawRefreshToken } = await this.authService.register(dto, ip, userAgent);

    this.cookieService.setRefreshCookie(res, rawRefreshToken);
    return session;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user credentials' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionDto> {
    const userAgent = req.headers['user-agent'];
    const { session, rawRefreshToken } = await this.authService.login(dto, ip, userAgent);

    this.cookieService.setRefreshCookie(res, rawRefreshToken);
    return session;
  }

  @Public()
  @UseGuards(CsrfOriginGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ): Promise<AuthTokensDto> {
    const cookieName = this.cookieService.getCookieName();
    const rawRefreshToken = req.cookies?.[cookieName];
    const userAgent = req.headers['user-agent'];

    try {
      const { accessToken, rawRefreshToken: newRawToken } =
        await this.authService.rotateRefreshToken(rawRefreshToken, ip, userAgent);

      this.cookieService.setRefreshCookie(res, newRawToken);
      return { accessToken };
    } catch (error) {
      // Clear refresh cookie on failed rotation
      this.cookieService.clearRefreshCookie(res);
      throw error;
    }
  }

  @Public()
  @UseGuards(CsrfOriginGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out current session and clear refresh cookie' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponseDto> {
    const cookieName = this.cookieService.getCookieName();
    const rawRefreshToken = req.cookies?.[cookieName];

    await this.authService.logout(rawRefreshToken);
    this.cookieService.clearRefreshCookie(res);

    return { message: 'Logged out successfully.' };
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Authenticated user profile' })
  async getMe(@CurrentUser() user: UserProfileDto): Promise<{ user: UserProfileDto }> {
    return { user };
  }

  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password and revoke all active sessions' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponseDto> {
    const result = await this.authService.changePassword(userId, dto);
    this.cookieService.clearRefreshCookie(res);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset instructions' })
  @ApiResponse({ status: 200, description: 'Password reset request acknowledged' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using cryptographic token' })
  @ApiResponse({ status: 200, description: 'Password successfully reset' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponseDto> {
    const result = await this.authService.resetPassword(dto);
    this.cookieService.clearRefreshCookie(res);
    return result;
  }
}
