import { Controller, Get, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from 'src/auth/get-user.decorator';
import { JwtGuard } from 'src/auth/jwt.guard';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('Transaction')
@Controller('transaction')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class GetHistoryController {
  constructor(private prisma: PrismaService) {}

  @Get('history')
  @ApiOperation({ summary: 'Get history' })
  async getHistory(@GetUser('id') userId: string) {
    // 1. Cari dompet user
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true }, // Optimasi: Kita cuma butuh ID dompetnya, tidak perlu load saldo dll
    });

    if (!wallet) {
      throw new NotFoundException('Dompet tidak ditemukan');
    }

    // 2. Ambil transaksi dengan Limit & Sorting
    const transactions = await this.prisma.transaction.findMany({
      where: {
        walletId: wallet.id,
      },
      orderBy: {
        createdAt: 'desc', // Waktu terbaru di urutan pertama
      },
      take: 20, // Batasi 20 transaksi terakhir (Best Practice untuk performa)
      select: {
        id: true,
        amount: true,
        type: true,
        createdAt: true,
      },
    });

    return {
      message: 'Berhasil mengambil riwayat transaksi',
      data: transactions,
    };
  }
}
