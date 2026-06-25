import { Module } from '@nestjs/common';
import { TopUpController } from './top-up/top-up.controller';
import { TransferController } from './transfer/transfer.controller';
import { GetHistoryController } from './get-history/get-history.controller';

@Module({
  controllers: [TopUpController, TransferController, GetHistoryController],
})
export class TransactionModule {}
