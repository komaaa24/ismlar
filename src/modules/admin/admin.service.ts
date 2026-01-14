import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import {
    UserEntity,
    TransactionEntity,
    PlanEntity,
} from '../../shared/database/entities';
import { TransactionStatus, PaymentProvider } from '../../shared/database/entities/enums';
import logger from '../../shared/utils/logger';
import { BotService } from '../bot/bot.service';

// Admin telegram ID
const ADMIN_IDS = ['7789445876'];

export interface AdminStats {
    totalUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    recentTransactions: Array<{
        id: string;
        userId: string;
        userName: string;
        amount: number;
        provider: string;
        status: string;
        createdAt: Date;
    }>;
    topUsers: Array<{
        id: string;
        telegramId: string;
        firstName: string;
        isActive: boolean;
        subscriptionEnd: Date | null;
    }>;
}

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @InjectRepository(TransactionEntity)
        private readonly transactionRepository: Repository<TransactionEntity>,
        @InjectRepository(PlanEntity)
        private readonly planRepository: Repository<PlanEntity>,
        private readonly botService: BotService,
    ) { }

    isAdmin(telegramId: string): boolean {
        return ADMIN_IDS.includes(telegramId);
    }

    async getStats(): Promise<AdminStats> {
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

        // Recent transactions (last 20)
        const recentTransactionEntities = await this.transactionRepository.find({
            relations: ['user'],
            order: { createdAt: 'DESC' },
            take: 20,
        });

        const recentTransactions = recentTransactionEntities.map((t) => ({
            id: t.id,
            userId: t.userId,
            userName: t.user?.firstName || 'Unknown',
            amount: t.amount || 0,
            provider: t.provider,
            status: t.status,
            createdAt: t.createdAt,
        }));

        // Top users (recent VIP users)
        const topUsers = await this.userRepository.find({
            where: { isActive: true },
            order: { subscriptionEnd: 'DESC' },
            take: 10,
        });

        return {
            totalUsers,
            activeSubscriptions,
            totalRevenue,
            recentTransactions,
            topUsers: topUsers.map((u) => ({
                id: u.id,
                telegramId: u.telegramId,
                firstName: u.firstName || 'Unknown',
                isActive: u.isActive || false,
                subscriptionEnd: u.subscriptionEnd,
            })),
        };
    }

    async grantLifetimeSubscription(userId: string, adminTelegramId: string): Promise<boolean> {
        if (!this.isAdmin(adminTelegramId)) {
            logger.warn('Unauthorized admin access attempt', { adminTelegramId, userId });
            return false;
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            logger.error('User not found for lifetime subscription', { userId });
            return false;
        }

        const subscriptionEndDate = new Date();
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1); // 1 yil

        await this.userRepository.update(
            { id: userId },
            {
                isActive: true,
                subscriptionEnd: subscriptionEndDate,
            },
        );

        logger.info('✅ Admin granted lifetime subscription', {
            adminTelegramId,
            userId,
            userTelegramId: user.telegramId,
            subscriptionEnd: subscriptionEndDate,
        });

        // Notify user
        try {
            const bot = this.botService.getBot();
            await bot.api.sendMessage(
                user.telegramId,
                `🎉 <b>Tabriklaymiz!</b>\n\n` +
                `✅ To'lov muvaffaqiyatli amalga oshirildi.\n` +
                `🌟 Siz 1 yillik obunaga ega bo'ldingiz.\n\n` +
                `✍️ Istalgan ismni yozing va darhol ma'nosini bilib oling.`,
                { parse_mode: 'HTML' },
            );
        } catch (error) {
            logger.error('Failed to notify user about admin subscription grant', error);
        }

        return true;
    }

    async revokeSubscription(userId: string, adminTelegramId: string): Promise<boolean> {
        if (!this.isAdmin(adminTelegramId)) {
            logger.warn('Unauthorized admin access attempt', { adminTelegramId, userId });
            return false;
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            logger.error('User not found for subscription revoke', { userId });
            return false;
        }

        await this.userRepository.update(
            { id: userId },
            {
                isActive: false,
                subscriptionEnd: null,
            },
        );

        logger.info('🚫 Admin revoked subscription', {
            adminTelegramId,
            userId,
            userTelegramId: user.telegramId,
        });

        // Notify user
        try {
            const bot = this.botService.getBot();
            await bot.api.sendMessage(
                user.telegramId,
                `⚠️ <b>Obuna bekor qilindi</b>\n\n` +
                `Sizning VIP obunangiz admin tomonidan bekor qilindi.\n\n` +
                `Agar bu xato bo'lsa, admin bilan bog'laning.`,
                { parse_mode: 'HTML' },
            );
        } catch (error) {
            logger.error('Failed to notify user about subscription revoke', error);
        }

        return true;
    }

    async findUserByTelegramId(telegramId: string): Promise<UserEntity | null> {
        return await this.userRepository.findOne({ where: { telegramId } });
    }

    async searchUsers(query: string): Promise<UserEntity[]> {
        // Search by telegram ID, first name, or user ID
        const users = await this.userRepository
            .createQueryBuilder('user')
            .where('user.telegramId LIKE :query', { query: `%${query}%` })
            .orWhere('user.firstName LIKE :query', { query: `%${query}%` })
            .orWhere('user.id LIKE :query', { query: `%${query}%` })
            .take(10)
            .getMany();

        return users;
    }
}
