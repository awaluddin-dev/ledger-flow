import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface JwtPayload {
  id: string;
  email: string;
}

// Ini akan menyedot data 'user' yang ditempelkan oleh Satpam (JwtStrategy) ke dalam Request
export const GetUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();

    // Jika kita panggil @GetUser('id'), dia hanya mengembalikan id-nya saja
    if (data) {
      return request.user[data];
    }

    // Jika panggil @GetUser(), kembalikan seluruh object user { id, email }
    return request.user;
  },
);
