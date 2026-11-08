import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserProfileDto } from '@bookflow/shared-types';

export const CurrentUser = createParamDecorator(
  (data: keyof UserProfileDto | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserProfileDto;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
