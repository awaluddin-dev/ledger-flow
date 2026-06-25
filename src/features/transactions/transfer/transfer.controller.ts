import { Body, Controller, Post, UseGuards, BadRequestException, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { GetUser } from 'src/auth/get-user.decorator';
import { JwtGuard } from 'src/auth/jwt.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { IsEmail, IsNotEmpty, IsNumber, IsPositive, Min } from 'class-validator';

export class TransferDto {
  @ApiProperty({ example: 'target@example.com', description: 'Email penerima' })
  @IsEmail({}, { message: 'Format email penerima salah' })
  @IsNotEmpty()
  targetEmail: string;

  @ApiProperty({ example: 25000, description: 'Nominal transfer' })
  @IsNumber({}, { message: 'Nominal harus berupa angka' })
  @IsPositive({ message: 'Nominal harus positif' })
  @Min(10000, { message: 'Minimal transfer adalah Rp 10.000' })
  amount: number;
}

@ApiTags('Transaction')
@Controller('transaction')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class TransferController {
  constructor(private prisma: PrismaService) {}

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer saldo' })
  async transfer(@GetUser('id') senderId: string, @Body() dto: TransferDto) {
    const [sender, receiver] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: senderId },
        include: { wallet: true },
      }),
      this.prisma.user.findUnique({
        where: { email: dto.targetEmail },
        include: { wallet: true },
      }),
    ]);

    if (!sender) {
      throw new NotFoundException('Pengirim tidak ditemukan');
    }

    if (!receiver) {
      throw new NotFoundException('Penerima tidak ditemukan');
    }

    if (sender.id === receiver.id) {
      throw new BadRequestException('Tidak bisa transfer ke diri sendiri');
    }

    if (Number(sender.wallet?.balance) < dto.amount) {
      throw new BadRequestException('Saldo tidak cukup');
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const updateSenderWallet = await tx.wallet.update({
          where: { id: sender.wallet?.id, version: sender.wallet?.version },
          data: {
            balance: { decrement: dto.amount },
            version: { increment: 1 },
          },
        });

        await tx.wallet.update({
          where: {
            id: receiver.wallet!.id,
            version: receiver.wallet!.version, // Kunci OCC
          },
          data: {
            balance: { increment: dto.amount },
            version: { increment: 1 },
          },
        });
        await tx.transaction.create({
          data: {
            amount: dto.amount,
            type: 'CREDIT',
            walletId: sender.wallet!.id,
          },
        });

        // D. Catat Histori Penerima (Uang Masuk)
        await tx.transaction.create({
          data: {
            amount: dto.amount,
            type: 'DEBIT',
            walletId: receiver.wallet!.id,
          },
        });

        return updateSenderWallet;
      });

      return {
        message: `Berhasil transfer Rp ${dto.amount} ke ${receiver.name}`,
        sisaSaldo: result.balance,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException(
          'Sistem sibuk (Race Condition dicegah). Silakan coba lagi.',
        );
      }
      console.error('❌ ERROR TRANSFER:', error);
      throw new InternalServerErrorException('Gagal memproses transfer');
    }
  }
}
