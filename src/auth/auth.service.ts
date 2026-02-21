import {
  ConflictException,
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

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
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
    return this.signToken(user.id, user.email);
  }

  // Helper function buat generate token
  private async signToken(userId: string, email: string) {
    const payload = {
      sub: userId,
      email,
    };

    const token = await this.jwt.signAsync(payload);

    return {
      access_token: token,
    };
  }
}
