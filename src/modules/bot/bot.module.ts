import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotService } from './bot.service';
import {
  UserEntity,
  PlanEntity,
  UserFavoriteNameEntity,
  UserPersonaProfileEntity,
  TransactionEntity,
} from '../../shared/database/entities';
import { NameMeaningService } from './services/name-meaning.service';
import { BotCoreService } from './services/bot-core.service';
import { NameInsightsService } from './services/name-insights.service';
import { UserFavoritesService } from './services/user-favorites.service';
import { UserPersonaService } from './services/user-persona.service';
import { AdminService } from './services/admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      PlanEntity,
      UserFavoriteNameEntity,
      UserPersonaProfileEntity,
      TransactionEntity,
    ]),
  ],
  providers: [
    BotCoreService,
    BotService,
    NameMeaningService,
    NameInsightsService,
    UserFavoritesService,
    UserPersonaService,
    AdminService,
  ],
  exports: [BotService],
})
export class BotModule { }
