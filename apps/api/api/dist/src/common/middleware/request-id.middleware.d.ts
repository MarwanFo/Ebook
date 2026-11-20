import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            id: string;
        }
    }
}
export declare class RequestIdMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void;
}
//# sourceMappingURL=request-id.middleware.d.ts.map