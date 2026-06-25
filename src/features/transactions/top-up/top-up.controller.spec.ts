import { Test, TestingModule } from '@nestjs/testing';
import { TopUpController, TopUpDto } from './top-up.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrismaService = {
  wallet: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('TopUpController', () => {
  let controller: TopUpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TopUpController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<TopUpController>(TopUpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('topUp', () => {
    it('should throw NotFoundException if wallet does not exist', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);

      await expect(
        controller.topUp('user-123', { amount: 50000 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
