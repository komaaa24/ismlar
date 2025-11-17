import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import {
  UserEntity,
  TransactionEntity,
  PlanEntity,
} from '../../shared/database/entities';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, TransactionEntity, PlanEntity]),
    BotModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
