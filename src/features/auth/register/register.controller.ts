import { Body, Controller, Post, HttpCode, HttpStatus, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiProperty } from '@nestjs/swagger';
import { PrismaService } from 'src/prisma/prisma.service';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email user' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'Nama lengkap' })
  @IsString()
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  name: string;

  @ApiProperty({ example: 'password123', description: 'Password minimal 8 karakter' })
  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  password: string;
}

@ApiTags('Auth')
@Controller('auth')
export class RegisterController {
  constructor(private prisma: PrismaService) {}

  @Post('register')
  @ApiOperation({ summary: 'Mendaftarkan user baru dan membuat dompet' })
  @ApiResponse({ status: 201, description: 'User berhasil dibuat' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
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
      console.error('ERROR REGISTER:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Email sudah terdaftar');
        }
      }

      throw new InternalServerErrorException('Gagal Membuat User');
    }
  }
}
