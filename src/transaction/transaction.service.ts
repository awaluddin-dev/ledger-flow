import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TopUpDto } from './dto/topUp.dto';
import { TransferDto } from './dto/transfer.dto';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async topUp(userId: string, dto: TopUpDto) {
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

  async transfer(senderId: string, dto: TransferDto) {
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

  async getHistory(userId: string) {
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
