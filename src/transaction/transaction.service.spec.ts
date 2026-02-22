import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './transaction.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

// 1. Kita buat database "Palsu" (Mock).
// Kita cegat perintah database agar tidak pergi ke PostgreSQL sungguhan.
const mockPrismaService = {
  wallet: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('TransactionService', () => {
  let service: TransactionService;

  beforeEach(async () => {
    // 2. Setup Modul Testing (Terisolasi)
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService, // Paksa NestJS pakai DB Palsu
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
  });

  // Test Case 1: Pastikan Service berhasil dimuat
  it('harus terdefinisi (should be defined)', () => {
    expect(service).toBeDefined();
  });

  // Test Case Group: Fitur Top Up
  describe('Fitur TopUp', () => {
    it('harus menolak transaksi (NotFound) jika dompet tidak ada', async () => {
      // Skenario: Kita suruh DB Palsu membalas "null" saat dicari
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);

      // Ekspektasi: Saat service.topUp dipanggil, dia HARUS melempar NotFoundException
      await expect(
        service.topUp('user-hantu-123', { amount: 50000 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
