import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/redis/redis.module';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class TokenService {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async generateAndSaveTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      // Access Token (15 Menit)
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_SECRET') as string,
        expiresIn: '15m',
      }),
      // Refresh Token (7 Hari)
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') as string,
        expiresIn: '7d',
      }),
    ]);

    // Simpan Refresh Token ke Redis dengan TTL 7 hari (dalam detik)
    const ttlInSeconds = 7 * 24 * 60 * 60;
    await this.redis.set(
      `user:${userId}:refresh_token`,
      refreshToken,
      'EX',
      ttlInSeconds,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') as string,
      });

      const redisKey = `user:${payload.sub}:refresh_token`;
      const storedToken = await this.redis.get(redisKey);

      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException(
          'Sesi tidak valid atau telah dicabut (Revoked)',
        );
      }
      return payload;
    } catch (error) {
       if (error instanceof UnauthorizedException) throw error;
       throw new UnauthorizedException(
        'Refresh token kadaluarsa atau tidak valid',
      );
    }
  }
}
