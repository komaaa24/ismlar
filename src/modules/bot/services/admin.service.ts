import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between } from 'typeorm';
import { Context } from 'grammy';
import {
    UserEntity,
    TransactionEntity,
    ActivityLogEntity,
    ActivityType,
} from '../../../shared/database/entities';
import { TransactionStatus } from '../../../shared/database/entities/enums';
import logger from '../../../shared/utils/logger';
import { ActivityTrackerService } from './activity-tracker.service';

// Admin telegram IDs
const ADMIN_IDS = [7789445876, 1083408, 85939027];

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @InjectRepository(TransactionEntity)
        private readonly transactionRepository: Repository<TransactionEntity>,
        @InjectRepository(ActivityLogEntity)
        private readonly activityRepository: Repository<ActivityLogEntity>,
        private readonly activityTracker: ActivityTrackerService,
    ) { }

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
                await this.sendDetailedStats(ctx);
                break;

            case 'activity':
                await this.sendActivityStats(ctx);
                break;

            case 'funnel':
                await this.sendPaymentFunnel(ctx);
                break;

            case 'users_active':
                await this.sendTopActiveUsers(ctx);
                break;

            case 'daily':
                await this.sendDailyStats(ctx);
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

            case 'help':
            default:
                await this.showAdminPanel(ctx);
        }
    }

    private async showAdminPanel(ctx: Context): Promise<void> {
        await ctx.reply(
            '🔧 <b>ADMIN PANEL</b>\n\n' +
            '📊 Statistika va boshqaruv tizimi\n\n' +
            '<b>Mavjud komandalar:</b>\n\n' +
            '<b>📊 Statistika:</b>\n' +
            '/stats - Umumiy statistika\n' +
            '/activity - Faollik statistikasi\n' +
            '/funnel - To\'lov voronkasi\n' +
            '/users_active - Eng faol foydalanuvchilar\n' +
            '/daily - Kunlik statistika (7 kun)\n\n' +
            '<b>👥 Boshqaruv:</b>\n' +
            '/grant <telegram_id> - 10 yillik obuna berish\n' +
            '/find <telegram_id> - Foydalanuvchini topish',
            { parse_mode: 'HTML' }
        );
    }

    async handleAdminCallback(ctx: Context, action: string): Promise<void> {
        const telegramId = ctx.from?.id;
        if (!telegramId || !this.isAdmin(telegramId)) {
            await ctx.answerCallbackQuery('❌ Sizda admin huquqlari yo\'q!');
            return;
        }

        switch (action) {
            case 'stats':
                await this.sendDetailedStats(ctx);
                break;
            case 'users':
                await this.sendUserStats(ctx);
                break;
            case 'payments':
                await this.sendPaymentStats(ctx);
                break;
            case 'activity':
                await this.sendActivityStats(ctx);
                break;
            case 'chart':
                await this.sendChartStats(ctx);
                break;
            default:
                await this.showAdminPanel(ctx);
        }

        await ctx.answerCallbackQuery();
    }

    private async sendDetailedStats(ctx: Context): Promise<void> {
        try {
            // Total users
            const totalUsers = await this.userRepository.count();

            // New users today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const newUsersToday = await this.userRepository.count({
                where: {
                    createdAt: MoreThan(today),
                },
            });

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
            const totalRevenue = paidTransactions.reduce((sum, t) => sum + (t.amount || 0), 0) / 100; // Convert tiyin to som
            const todayRevenue = paidTransactions
                .filter(t => t.performTime && new Date(t.performTime) >= today)
                .reduce((sum, t) => sum + (t.amount || 0), 0) / 100; // Convert tiyin to som

            // Payment providers stats
            const clickPayments = paidTransactions.filter(t => t.provider === 'click').length;
            const paymePayments = paidTransactions.filter(t => t.provider === 'payme').length;

            

            // Bot Commands
            const startCommands = await this.activityRepository.count({
                where: { activityType: ActivityType.START_COMMAND },
            });

            const nameSearches = await this.activityRepository.count({
                where: { activityType: ActivityType.NAME_SEARCHED },
            });

            // Inline Keyboard Clicks
            const nameMeaningClicks = await this.activityRepository.count({
                where: { activityType: ActivityType.NAME_MEANING_CLICK },
            });

            const personalTavsiyaClicks = await this.activityRepository.count({
                where: { activityType: ActivityType.PERSONAL_TAVSIYA_CLICK },
            });

            const trendsClicks = await this.activityRepository.count({
                where: { activityType: ActivityType.TRENDS_CLICK },
            });

            const favoritesClicks = await this.activityRepository.count({
                where: { activityType: ActivityType.FAVORITES_CLICK },
            });

            // Payment Actions
            const paymentScreens = await this.activityRepository.count({
                where: { activityType: ActivityType.PAYMENT_SCREEN_OPENED },
            });

            const paymeClicks = await this.activityRepository.count({
                where: { activityType: ActivityType.PAYME_CLICKED },
            });

            const clickClicks = await this.activityRepository.count({
                where: { activityType: ActivityType.CLICK_CLICKED },
            });

            const successfulPayments = await this.activityRepository.count({
                where: { activityType: ActivityType.PAYMENT_SUCCESS },
            });

            const cancelledPayments = await this.activityRepository.count({
                where: { activityType: ActivityType.PAYMENT_FAILED },
            });

            // Calculate conversion rate
            const totalPaymentAttempts = paymentScreens;
            const conversionRate = totalPaymentAttempts > 0
                ? ((successfulPayments / totalPaymentAttempts) * 100).toFixed(1)
                : '0.0';

            let statsMessage =
                '📊 <b>BATAFSIL STATISTIKA</b>\n\n' +
                '👥 <b>FOYDALANUVCHILAR:</b>\n' +
                `├ Jami: <b>${totalUsers}</b>\n` +
                `├ Bugun yangi: <b>${newUsersToday}</b>\n` +
                `└ Aktiv obunalar: <b>${activeSubscriptions}</b> (${((activeSubscriptions / totalUsers) * 100).toFixed(1)}%)\n\n` +
                '💰 <b>MOLIYAVIY:</b>\n' +
                `├ Jami daromad: <b>${(totalRevenue || 0).toLocaleString('uz-UZ')} so'm</b>\n` +
                `├ Bugun: <b>${(todayRevenue || 0).toLocaleString('uz-UZ')} so'm</b>\n` +
                `├ Jami to'lovlar: <b>${paidTransactions.length}</b>\n` +
                `├ Click: <b>${clickPayments}</b>\n` +
                `└ Payme: <b>${paymePayments}</b>\n\n` +
                '📱 <b>BOT KOMANDALAR:</b>\n' +
                `├ /start: <b>${startCommands}</b>\n` +
                `└ Ism qidiruvlar: <b>${nameSearches}</b>\n\n` +
                '⌨️ <b>INLINE KEYBOARD BOSISHLAR:</b>\n' +
                `├ 🔍 Ism Ma'nosi: <b>${nameMeaningClicks}</b>\n` +
                `├ 🎯 Shaxsiy Tavsiya: <b>${personalTavsiyaClicks}</b>\n` +
                `├ 📊 Trendlar: <b>${trendsClicks}</b>\n` +
                `└ ⭐ Sevimlilar: <b>${favoritesClicks}</b>\n\n` +
                '💳 <b>TO\'LOV HARAKATLARI:</b>\n' +
                `├ To'lov ekrani: <b>${paymentScreens}</b>\n` +
                `├ Payme: <b>${paymeClicks}</b>\n` +
                `├ Click: <b>${clickClicks}</b>\n` +
                `├ ✅ Muvaffaqiyatli: <b>${successfulPayments}</b>\n` +
                `└ ❌ Bekor qilindi: <b>${cancelledPayments}</b>\n\n` +
                `💡 <b>Konversiya:</b> ${conversionRate}%\n\n` +
                `📅 Sana: ${new Date().toLocaleString('uz-UZ')}`;

            await ctx.reply(statsMessage, { parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Admin detailed stats error:', error);
            await ctx.reply('❌ Statistikani yuklashda xatolik!');
        }
    }

    private async sendUserStats(ctx: Context): Promise<void> {
        try {
            const totalUsers = await this.userRepository.count();
            const activeUsers = await this.userRepository.count({
                where: { isActive: true, subscriptionEnd: MoreThan(new Date()) },
            });

            // Last 7 days registration
            const last7Days = new Date();
            last7Days.setDate(last7Days.getDate() - 7);
            const newUsersWeek = await this.userRepository.count({
                where: { createdAt: MoreThan(last7Days) },
            });

            // Last 30 days
            const last30Days = new Date();
            last30Days.setDate(last30Days.getDate() - 30);
            const newUsersMonth = await this.userRepository.count({
                where: { createdAt: MoreThan(last30Days) },
            });

            const conversionRate = totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) : '0';

            const message =
                '👥 <b>FOYDALANUVCHILAR STATISTIKASI</b>\n\n' +
                `📈 Jami: <b>${totalUsers}</b>\n` +
                `✅ Premium: <b>${activeUsers}</b>\n` +
                `👤 Oddiy: <b>${totalUsers - activeUsers}</b>\n\n` +
                `📅 So'nggi 7 kun: <b>+${newUsersWeek}</b>\n` +
                `📅 So'nggi 30 kun: <b>+${newUsersMonth}</b>\n\n` +
                `💎 Konversiya: <b>${conversionRate}%</b>`;

            await ctx.reply(message, { parse_mode: 'HTML' });
        } catch (error) {
            logger.error('User stats error:', error);
            await ctx.reply('❌ Statistikani yuklashda xatolik!');
        }
    }

    private async sendPaymentStats(ctx: Context): Promise<void> {
        try {
            const allTransactions = await this.transactionRepository.find();
            const paidTransactions = allTransactions.filter(t => t.status === TransactionStatus.PAID);
            const pendingTransactions = allTransactions.filter(t => t.status === TransactionStatus.PENDING);
            const failedTransactions = allTransactions.filter(t => t.status === TransactionStatus.FAILED);

            const totalRevenue = paidTransactions.reduce((sum, t) => sum + (t.amount || 0), 0) / 100; // Convert to som
            const avgTransaction = paidTransactions.length > 0
                ? (totalRevenue / paidTransactions.length).toFixed(0)
                : '0';

            // Today's transactions
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayTransactions = paidTransactions.filter(
                t => t.performTime && new Date(t.performTime) >= today
            );
            const todayRevenue = todayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0) / 100; // Convert to som

            const message =
                '💰 <b>TO\'LOVLAR STATISTIKASI</b>\n\n' +
                `✅ Muvaffaqiyatli: <b>${paidTransactions.length}</b>\n` +
                `⏳ Kutilmoqda: <b>${pendingTransactions.length}</b>\n` +
                `❌ Bekor qilingan: <b>${failedTransactions.length}</b>\n\n` +
                `💵 Jami daromad: <b>${(totalRevenue || 0).toLocaleString('uz-UZ')} so'm</b>\n` +
                `📊 O'rtacha to'lov: <b>${avgTransaction} so'm</b>\n\n` +
                `📅 Bugun:\n` +
                `├ To'lovlar: <b>${todayTransactions.length}</b>\n` +
                `└ Daromad: <b>${(todayRevenue || 0).toLocaleString('uz-UZ')} so'm</b>`;

            await ctx.reply(message, { parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Payment stats error:', error);
            await ctx.reply('❌ Statistikani yuklashda xatolik!');
        }
    }

    private async sendActivityStats(ctx: Context): Promise<void> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Get inline keyboard stats
            const inlineStats = await this.activityTracker.getInlineKeyboardStats(today, tomorrow);

            // Count activities
            const startCommands = await this.activityRepository.count({
                where: { activityType: ActivityType.START_COMMAND, createdAt: MoreThan(today) },
            });

            const message =
                '🎯 <b>FAOLLIK STATISTIKASI (Bugun)</b>\n\n' +
                '<b>🤖 Bot komandalar:</b>\n' +
                `├ /start: <b>${startCommands}</b>\n` +
                '<b>⌨️ Tugma bosishlar:</b>\n' +
                `├ 🔍 Ism Ma'nosi: <b>${inlineStats[ActivityType.NAME_MEANING_CLICK] || 0}</b>\n` +
                `├ 🎯 Shaxsiy Tavsiya: <b>${inlineStats[ActivityType.PERSONAL_TAVSIYA_CLICK] || 0}</b>\n` +
                `├ 📜 Oferta: <b>${inlineStats[ActivityType.OFERTA_CLICK] || 0}</b>\n` +
                `├ 💳 Payme: <b>${inlineStats[ActivityType.PAYME_CLICKED] || 0}</b>\n` +
                `└ 🟢 Click: <b>${inlineStats[ActivityType.CLICK_CLICKED] || 0}</b>`;

            await ctx.reply(message, { parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Activity stats error:', error);
            await ctx.reply('❌ Statistikani yuklashda xatolik!');
        }
    }

    private async sendPaymentFunnel(ctx: Context): Promise<void> {
        try {
            // All-time funnel
            const allTimeFunnel = await this.activityTracker.getPaymentFunnel();

            // Today's funnel
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const todayFunnel = await this.activityTracker.getPaymentFunnel(today, tomorrow);

            const message =
                '🔄 <b>TO\'LOV VORONKASI (Payment Funnel)</b>\n\n' +
                '<b>📊 Jami (Barcha vaqt):</b>\n' +
                `1️⃣ To'lov ekrani: <b>${allTimeFunnel.paymentScreens}</b>\n` +
                `2️⃣ Payme bosildi: <b>${allTimeFunnel.paymeClicks}</b>\n` +
                `3️⃣ Click bosildi: <b>${allTimeFunnel.clickClicks}</b>\n` +
                `4️⃣ Jami bosishlar: <b>${allTimeFunnel.totalProviderClicks}</b>\n` +
                `5️⃣ ✅ To'lovlar: <b>${allTimeFunnel.successPayments}</b>\n` +
                `6️⃣ ❌ Bekor qilindi: <b>${allTimeFunnel.failedPayments}</b>\n\n` +
                `💎 Konversiya: <b>${allTimeFunnel.conversionRate}</b>\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n\n` +
                '<b>📅 Bugun:</b>\n' +
                `1️⃣ To'lov ekrani: <b>${todayFunnel.paymentScreens}</b>\n` +
                `2️⃣ Payme: <b>${todayFunnel.paymeClicks}</b>\n` +
                `3️⃣ Click: <b>${todayFunnel.clickClicks}</b>\n` +
                `4️⃣ ✅ To'lovlar: <b>${todayFunnel.successPayments}</b>\n` +
                `💎 Konversiya: <b>${todayFunnel.conversionRate}</b>`;

            await ctx.reply(message, { parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Payment funnel error:', error);
            await ctx.reply('❌ Statistikani yuklashda xatolik!');
        }
    }

    private async sendTopActiveUsers(ctx: Context): Promise<void> {
        try {
            const topUsers = await this.activityTracker.getTopActiveUsers(10);

            if (!topUsers.length) {
                await ctx.reply('📊 Hozircha faol foydalanuvchilar yo\'q.');
                return;
            }

            let message = '👥 <b>ENG FAOL FOYDALANUVCHILAR (Top 10)</b>\n\n';

            topUsers.forEach((item, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                const name = item.user?.firstName || 'Unknown';
                message += `${medal} <b>${name}</b>\n`;
                message += `   └ ID: <code>${item.telegramId}</code>\n`;
                message += `   └ Harakatlar: <b>${item.activityCount}</b>\n\n`;
            });

            await ctx.reply(message, { parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Top active users error:', error);
            await ctx.reply('❌ Statistikani yuklashda xatolik!');
        }
    }

    private async sendDailyStats(ctx: Context): Promise<void> {
        try {
            const dailyStats = await this.activityTracker.getDailyStats(7);

            let message = '📅 <b>KUNLIK STATISTIKA (7 kun)</b>\n\n';

            for (const day of dailyStats) {
                const dailyPayments = await this.transactionRepository.count({
                    where: {
                        status: TransactionStatus.PAID,
                        performTime: Between(day.startDate, day.endDate),
                    },
                });

                message += `📆 <b>${day.dateLabel}</b>\n`;
                message += `├ /start tugmasini bosganlar: ${day.startCommands}\n`;
                message += `├ 🔍 Ism Ma'nosi tugmasini bosganlar: ${day.nameMeaningClicks}\n`;
                message += `├ 🎯 Shaxsiy Tavsiya tugmasini bosganlar: ${day.personalTavsiyaClicks}\n`;
                message += `├ 📜 Oferta tugmasini bosganlar: ${day.ofertaClicks}\n`;
                message += `├ 💳 Payme tugmasini bosganlar: ${day.paymeClicks}\n`;
                message += `└ 🟢 Click tugmasini bosganlar: ${day.clickClicks}\n`;
                message += dailyPayments > 0
                    ? `   💰 To'lovlar: ${dailyPayments}\n\n`
                    : `   💰 To'lov qilinmagan\n\n`;
            }

            await ctx.reply(message, { parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Daily stats error:', error);
            await ctx.reply('❌ Statistikani yuklashda xatolik!');
        }
    }

    private async sendChartStats(ctx: Context): Promise<void> {
        try {
            // Get last 7 days data
            const stats: { date: string; users: number; payments: number }[] = [];

            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);

                const nextDay = new Date(date);
                nextDay.setDate(nextDay.getDate() + 1);

                const users = await this.userRepository.count({
                    where: {
                        createdAt: MoreThan(date),
                    },
                });

                const payments = await this.transactionRepository.count({
                    where: {
                        status: TransactionStatus.PAID,
                        performTime: MoreThan(date),
                    },
                });

                stats.push({
                    date: date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' }),
                    users,
                    payments,
                });
            }

            let message = '📈 <b>7 KUNLIK GRAFIK</b>\n\n';

            stats.forEach(day => {
                const userBar = '█'.repeat(Math.min(day.users / 5, 10));
                const paymentBar = '▓'.repeat(Math.min(day.payments / 2, 10));
                message += `${day.date}\n`;
                message += `👥 ${userBar} ${day.users}\n`;
                message += `💰 ${paymentBar} ${day.payments}\n\n`;
            });

            await ctx.reply(message, { parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Chart stats error:', error);
            await ctx.reply('❌ Grafikni yuklashda xatolik!');
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
            subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 10);

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
                `Status: <b>VIP (10 yillik)</b> ♾️`,
                { parse_mode: 'HTML' }
            );

            // Notify user
            try {
                await ctx.api.sendMessage(
                    user.telegramId,
                    `🎉 <b>Tabriklaymiz!</b>\n\n` +
                    `✅ To'lov muvaffaqiyatli amalga oshirildi.\n` +
                    `🌟 Siz 10 yillik obunaga ega bo'ldingiz.\n\n` +
                    `✍️ Istalgan ismni yozing va darhol ma'nosini bilib oling.`,
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
