import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import Redis from 'ioredis';

interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async register(dto: RegisterDto) {
    const hash = await argon2.hash(dto.password);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            name: dto.name,
            password: hash,
          },
        });

        await tx.wallet.create({
          data: {
            userId: user.id,
            balance: 0,
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        };
      });

      return result;
    } catch (error) {
      console.error('sERROR REGISTER:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Email sudah terdaftar');
        }
      }

      throw new InternalServerErrorException('Gagal Membuat User');
    }
  }

  async login(dto: LoginDto) {
    // 1. Cari User by Email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    // 2. Cek Password (Argon2 Verify)
    const pwMatches = await argon2.verify(user.password, dto.password);
    if (!pwMatches) {
      throw new UnauthorizedException('Email atau password salah');
    }

    // 3. Generate Token (Tanda tangan digital)
    return this.generateAndSaveTokens(user.id, user.email);
  }

  async refreshToken(refreshToken: string) {
    // 2. Verifikasi keaslian Refresh Token (Apakah ini buatan sistem kita?)
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

      // 3. Jika valid, buatkan pasangan token yang baru (Token Rotation)
      return this.generateAndSaveTokens(payload.sub, payload.email);
    } catch (error) {
      // Jika token expired atau manipulasi, hapus dari redis sekalian (Security)
      console.error(error);
      throw new UnauthorizedException(
        'Refresh token kadaluarsa atau tidak valid',
      );
    }
  }

  private async generateAndSaveTokens(userId: string, email: string) {
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
}
