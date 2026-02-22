import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/auth/jwt.guard';
import { TransactionService } from './transaction.service';
import { TopUpDto } from './dto/topUp.dto';
import { GetUser } from 'src/auth/get-user.decorator';
import { TransferDto } from './dto/transfer.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Transaction')
@Controller('transaction')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('topup')
  @ApiOperation({ summary: 'Top up saldo' })
  async topUp(@GetUser('id') userId: string, @Body() dto: TopUpDto) {
    return this.transactionService.topUp(userId, dto);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer saldo' })
  async transfer(@GetUser('id') userId: string, @Body() dto: TransferDto) {
    return this.transactionService.transfer(userId, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get history' })
  async getHistory(@GetUser('id') userId: string) {
    return this.transactionService.getHistory(userId);
  }
}
