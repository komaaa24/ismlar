import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Context } from 'grammy';
import {
  UserEntity,
  TransactionEntity,
} from '../../../shared/database/entities';
import { TransactionStatus } from '../../../shared/database/entities/enums';
import logger from '../../../shared/utils/logger';

// Admin telegram IDs
const ADMIN_IDS = [7789445876];

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
  ) {}

  isAdmin(telegramId: number): boolean {
    return ADMIN_IDS.includes(telegramId);
  }

  async handleAdminCommand(ctx: Context, command: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId || !this.isAdmin(telegramId)) {
      await ctx.reply('❌ Sizda admin huquqlari yo\'q!');
      return;
    }

    const parts = ctx.message?.text?.split(' ') || [];

    switch (command) {
      case 'stats':
        await this.sendStats(ctx);
        break;
      
      case 'grant':
        if (parts.length < 2) {
          await ctx.reply('❌ Format: /grant <telegram_id>');
          return;
        }
        await this.grantSubscription(ctx, parts[1]);
        break;
      
      case 'revoke':
        if (parts.length < 2) {
          await ctx.reply('❌ Format: /revoke <telegram_id>');
          return;
        }
        await this.revokeSubscription(ctx, parts[1]);
        break;
      
      case 'find':
        if (parts.length < 2) {
          await ctx.reply('❌ Format: /find <telegram_id or name>');
          return;
        }
        await this.findUser(ctx, parts[1]);
        break;
      
      default:
        await ctx.reply(
          '🔧 <b>Admin Panel</b>\n\n' +
          'Mavjud komandalar:\n' +
          '/stats - Statistikani ko\'rish\n' +
          '/grant <telegram_id> - Umrbod obuna berish\n' +
          '/revoke <telegram_id> - Obunani bekor qilish\n' +
          '/find <telegram_id> - Foydalanuvchini topish',
          { parse_mode: 'HTML' }
        );
    }
  }

  private async sendStats(ctx: Context): Promise<void> {
    try {
      // Total users
      const totalUsers = await this.userRepository.count();

      // Active subscriptions
      const activeSubscriptions = await this.userRepository.count({
        where: {
          isActive: true,
          subscriptionEnd: MoreThan(new Date()),
        },
      });

      // Total revenue
      const paidTransactions = await this.transactionRepository.find({
        where: { status: TransactionStatus.PAID },
      });
      const totalRevenue = paidTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

      // Recent transactions (last 10)
      const recentTransactions = await this.transactionRepository.find({
        order: { createdAt: 'DESC' },
        take: 10,
      });

      let statsMessage = 
        '📊 <b>STATISTIKA</b>\n\n' +
        `👥 Jami foydalanuvchilar: <b>${totalUsers}</b>\n` +
        `✅ Aktiv obunalar: <b>${activeSubscriptions}</b>\n` +
        `💰 Jami daromad: <b>${totalRevenue.toLocaleString()} so'm</b>\n\n` +
        '📋 <b>So\'nggi 10 ta to\'lov:</b>\n';

      recentTransactions.forEach((t, i) => {
        const status = t.status === TransactionStatus.PAID ? '✅' : 
                      t.status === TransactionStatus.FAILED ? '❌' : '⏳';
        statsMessage += `${i + 1}. ${status} ${t.amount?.toLocaleString()} so'm (${t.provider})\n`;
      });

      await ctx.reply(statsMessage, { parse_mode: 'HTML' });
    } catch (error) {
      logger.error('Admin stats error:', error);
      await ctx.reply('❌ Statistikani yuklashda xatolik!');
    }
  }

  private async grantSubscription(ctx: Context, targetTelegramId: string): Promise<void> {
    try {
      const telegramIdNum = parseInt(targetTelegramId);
      const user = await this.userRepository.findOne({ 
        where: { telegramId: telegramIdNum } 
      });

      if (!user) {
        await ctx.reply(`❌ Telegram ID ${targetTelegramId} topilmadi!`);
        return;
      }

      const subscriptionEndDate = new Date();
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 100); // 100 years

      await this.userRepository.update(
        { id: user.id },
        {
          isActive: true,
          subscriptionEnd: subscriptionEndDate,
        },
      );

      logger.info('✅ Admin granted lifetime subscription', {
        adminId: ctx.from?.id,
        userId: user.id,
        userTelegramId: user.telegramId,
      });

      await ctx.reply(
        `✅ <b>Muvaffaqiyatli!</b>\n\n` +
        `Foydalanuvchi: ${user.firstName || 'Unknown'}\n` +
        `Telegram ID: ${user.telegramId}\n` +
        `Status: <b>VIP (Umrbod)</b> ♾️`,
        { parse_mode: 'HTML' }
      );

      // Notify user
      try {
        await ctx.api.sendMessage(
          user.telegramId,
          `🎁 <b>Ajoyib yangilik!</b>\n\n` +
          `✅ Sizga admin tomonidan <b>UMRBOD obuna</b> berildi!\n\n` +
          `🌟 <b>Endi siz VIP foydalanuvchisiz!</b>\n` +
          `♾️ Barcha ismlar manosi umrbod ochiq!\n\n` +
          `Botdan bemalol foydalanishingiz mumkin! 🚀`,
          { parse_mode: 'HTML' },
        );
      } catch (notifyError) {
        logger.error('Failed to notify user:', notifyError);
      }
    } catch (error) {
      logger.error('Grant subscription error:', error);
      await ctx.reply('❌ Obuna berishda xatolik!');
    }
  }

  private async revokeSubscription(ctx: Context, targetTelegramId: string): Promise<void> {
    try {
      const telegramIdNum = parseInt(targetTelegramId);
      const user = await this.userRepository.findOne({ 
        where: { telegramId: telegramIdNum } 
      });

      if (!user) {
        await ctx.reply(`❌ Telegram ID ${targetTelegramId} topilmadi!`);
        return;
      }

      await this.userRepository.update(
        { id: user.id },
        {
          isActive: false,
          subscriptionEnd: null,
        },
      );

      logger.info('🚫 Admin revoked subscription', {
        adminId: ctx.from?.id,
        userId: user.id,
        userTelegramId: user.telegramId,
      });

      await ctx.reply(
        `✅ <b>Obuna bekor qilindi!</b>\n\n` +
        `Foydalanuvchi: ${user.firstName || 'Unknown'}\n` +
        `Telegram ID: ${user.telegramId}\n` +
        `Status: <b>Oddiy foydalanuvchi</b>`,
        { parse_mode: 'HTML' }
      );

      // Notify user
      try {
        await ctx.api.sendMessage(
          user.telegramId,
          `⚠️ <b>Obuna bekor qilindi</b>\n\n` +
          `Sizning VIP obunangiz admin tomonidan bekor qilindi.\n\n` +
          `Agar bu xato bo'lsa, admin bilan bog'laning.`,
          { parse_mode: 'HTML' },
        );
      } catch (notifyError) {
        logger.error('Failed to notify user:', notifyError);
      }
    } catch (error) {
      logger.error('Revoke subscription error:', error);
      await ctx.reply('❌ Obunani bekor qilishda xatolik!');
    }
  }

  private async findUser(ctx: Context, query: string): Promise<void> {
    try {
      let user: UserEntity | null = null;

      // Try to find by telegram ID first
      const telegramIdNum = parseInt(query);
      if (!isNaN(telegramIdNum)) {
        user = await this.userRepository.findOne({ 
          where: { telegramId: telegramIdNum } 
        });
      }

      // If not found, search by name
      if (!user) {
        const users = await this.userRepository
          .createQueryBuilder('user')
          .where('user.firstName LIKE :query', { query: `%${query}%` })
          .orWhere('user.lastName LIKE :query', { query: `%${query}%` })
          .take(5)
          .getMany();

        if (users.length === 0) {
          await ctx.reply(`❌ "${query}" bo'yicha foydalanuvchi topilmadi!`);
          return;
        }

        if (users.length === 1) {
          user = users[0];
        } else {
          let message = `🔍 <b>Topilgan foydalanuvchilar:</b>\n\n`;
          users.forEach((u, i) => {
            const status = u.isActive && u.subscriptionEnd && new Date(u.subscriptionEnd) > new Date() 
              ? '✅ VIP' 
              : '👤 Oddiy';
            message += `${i + 1}. ${u.firstName || 'Unknown'} (ID: ${u.telegramId}) - ${status}\n`;
          });
          await ctx.reply(message, { parse_mode: 'HTML' });
          return;
        }
      }

      if (!user) {
        await ctx.reply(`❌ Foydalanuvchi topilmadi!`);
        return;
      }

      const isActive = user.isActive && user.subscriptionEnd && new Date(user.subscriptionEnd) > new Date();
      const statusEmoji = isActive ? '✅' : '❌';
      const statusText = isActive ? 'VIP (Aktiv)' : 'Oddiy';

      let message = 
        `👤 <b>FOYDALANUVCHI MA'LUMOTLARI</b>\n\n` +
        `Ism: ${user.firstName || 'Unknown'}\n` +
        `Telegram ID: <code>${user.telegramId}</code>\n` +
        `Status: ${statusEmoji} ${statusText}\n`;

      if (user.subscriptionEnd) {
        message += `Obuna tugashi: ${new Date(user.subscriptionEnd).toLocaleDateString('uz-UZ')}\n`;
      }

      message += `\n<b>Amallar:</b>\n`;
      message += `/grant ${user.telegramId} - Obuna berish\n`;
      message += `/revoke ${user.telegramId} - Obunani bekor qilish`;

      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
      logger.error('Find user error:', error);
      await ctx.reply('❌ Foydalanuvchini topishda xatolik!');
    }
  }
}
