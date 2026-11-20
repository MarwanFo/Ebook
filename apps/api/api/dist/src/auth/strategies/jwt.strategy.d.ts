import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { UserProfileDto } from '@bookflow/shared-types';
export interface JwtPayload {
    sub: string;
    jti: string;
    iss: string;
    aud: string;
    iat: number;
    exp: number;
}
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly usersService;
    constructor(configService: ConfigService, usersService: UsersService);
    validate(payload: JwtPayload): Promise<UserProfileDto>;
}
export {};
//# sourceMappingURL=jwt.strategy.d.ts.map