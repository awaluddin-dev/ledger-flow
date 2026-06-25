import { Body, Controller, Post, UseGuards, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { GetUser } from 'src/auth/get-user.decorator';
import { JwtGuard } from 'src/auth/jwt.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { IsNumber, IsPositive, Min } from 'class-validator';

export class TopUpDto {
  @ApiProperty({ example: 50000, description: 'Nominal top up' })
  @IsNumber({}, { message: 'Nominal harus berupa angka' })
  @IsPositive({ message: 'Nominal harus positif' })
  @Min(10000, { message: 'Minimal top up adalah Rp 10.000' })
  amount: number;
}

@ApiTags('Transaction')
@Controller('transaction')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class TopUpController {
  constructor(private prisma: PrismaService) {}

  @Post('topup')
  @ApiOperation({ summary: 'Top up saldo' })
  async topUp(@GetUser('id') userId: string, @Body() dto: TopUpDto) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet tidak ditemukan');
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const updateWallet = await tx.wallet.update({
          where: { id: wallet.id, version: wallet.version },
          data: {
            balance: { increment: dto.amount },
            version: { increment: 1 },
          },
        });

        await tx.transaction.create({
          data: {
            amount: dto.amount,
            type: 'DEBIT',
            walletId: wallet.id,
          },
        });

        return updateWallet;
      });

      return {
        message: 'top up berhasil',
        newBalance: result.balance,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException(
          'Sistem sedang sibuk memproses transaksi lain. Saldo aman. Silakan coba lagi.',
        );
      }

      console.error('ERROR TOPUP:', error);
      throw new InternalServerErrorException('Gagal memproses top up');
    }
  }
}
