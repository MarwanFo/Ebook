import { ResetPasswordDto as IResetPasswordDto } from '@bookflow/shared-types';
export declare class ResetPasswordDto implements IResetPasswordDto {
    token?: string;
    email?: string;
    otp?: string;
    newPassword: string;
}
//# sourceMappingURL=reset-password.dto.d.ts.map