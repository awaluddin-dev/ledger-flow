import { Body, Controller, Post, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiProperty } from '@nestjs/swagger';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokenService } from '../shared/token.service';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import * as argon2 from 'argon2';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  password: string;
}

@ApiTags('Auth')
@Controller('auth')
export class LoginController {
  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login user dan mendapatkan JWT Token' })
  @ApiResponse({ status: 200, description: 'Login berhasil' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const pwMatches = await argon2.verify(user.password, dto.password);
    if (!pwMatches) {
      throw new UnauthorizedException('Email atau password salah');
    }

    return this.tokenService.generateAndSaveTokens(user.id, user.email);
  }
}
