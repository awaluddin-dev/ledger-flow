import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/auth/jwt.guard';
import { TransactionService } from './transaction.service';
import { TopUpDto } from './dto/topUp.dto';
import { GetUser } from 'src/auth/get-user.decorator';
import { TransferDto } from './dto/transfer.dto';

@Controller('transaction')
@UseGuards(JwtGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('topup')
  async topUp(@GetUser('id') userId: string, @Body() dto: TopUpDto) {
    return this.transactionService.topUp(userId, dto);
  }

  @Post('transfer')
  async transfer(@GetUser('id') userId: string, @Body() dto: TransferDto) {
    return this.transactionService.transfer(userId, dto);
  }

  @Get('history')
  async getHistory(@GetUser('id') userId: string) {
    return this.transactionService.getHistory(userId);
  }
}
