import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ActivityLogEntity, ActivityType } from '../../../shared/database/entities';
import logger from '../../../shared/utils/logger';

@Injectable()
export class ActivityTrackerService {
    constructor(
        @InjectRepository(ActivityLogEntity)
        private readonly activityRepository: Repository<ActivityLogEntity>,
    ) { }

    async trackActivity(
        telegramId: number,
        activityType: ActivityType,
        metadata?: Record<string, any>,
        userId?: string,
    ): Promise<void> {
        try {
            const activity = this.activityRepository.create({
                telegramId,
                userId: userId || null,
                activityType,
                metadata: metadata || {},
            });
            await this.activityRepository.save(activity);
        } catch (error) {
            logger.error('Failed to track activity:', error);
        }
    }

    async getStatsByPeriod(startDate: Date, endDate: Date) {
        const activities = await this.activityRepository.find({
            where: {
                createdAt: Between(startDate, endDate),
            },
            relations: ['user'],
        });

        // Group by activity type
        const byType: Record<string, number> = {};
        const uniqueUsers = new Set<number>();
        const userActivities: Record<number, Record<string, number>> = {};

        activities.forEach((activity) => {
            // Count by type
            byType[activity.activityType] = (byType[activity.activityType] || 0) + 1;

            // Track unique users
            uniqueUsers.add(activity.telegramId);

            // Track per-user activities
            if (!userActivities[activity.telegramId]) {
                userActivities[activity.telegramId] = {};
            }
            userActivities[activity.telegramId][activity.activityType] =
                (userActivities[activity.telegramId][activity.activityType] || 0) + 1;
        });

        return {
            totalActivities: activities.length,
            uniqueUsers: uniqueUsers.size,
            byType,
            userActivities,
            activities,
        };
    }

    async getPaymentFunnel(startDate?: Date, endDate?: Date) {
        const where: any = {};
        if (startDate && endDate) {
            where.createdAt = Between(startDate, endDate);
        }

        const paymentScreens = await this.activityRepository.count({
            where: {
                ...where,
                activityType: ActivityType.PAYMENT_SCREEN_OPENED,
            },
        });

        const paymeClicks = await this.activityRepository.count({
            where: {
                ...where,
                activityType: ActivityType.PAYME_CLICKED,
            },
        });

        const clickClicks = await this.activityRepository.count({
            where: {
                ...where,
                activityType: ActivityType.CLICK_CLICKED,
            },
        });

        const successPayments = await this.activityRepository.count({
            where: {
                ...where,
                activityType: ActivityType.PAYMENT_SUCCESS,
            },
        });

        const failedPayments = await this.activityRepository.count({
            where: {
                ...where,
                activityType: ActivityType.PAYMENT_FAILED,
            },
        });

        const conversionRate = paymentScreens > 0
            ? ((successPayments / paymentScreens) * 100).toFixed(2)
            : '0';

        return {
            paymentScreens,
            paymeClicks,
            clickClicks,
            totalProviderClicks: paymeClicks + clickClicks,
            successPayments,
            failedPayments,
            conversionRate: `${conversionRate}%`,
        };
    }

    async getUserActivityReport(telegramId: number) {
        const activities = await this.activityRepository.find({
            where: { telegramId },
            order: { createdAt: 'DESC' },
            take: 100,
        });

        const activityCounts: Record<string, number> = {};
        activities.forEach((activity) => {
            activityCounts[activity.activityType] = (activityCounts[activity.activityType] || 0) + 1;
        });

        return {
            totalActivities: activities.length,
            activityCounts,
            recentActivities: activities.slice(0, 10),
            firstActivity: activities[activities.length - 1],
            lastActivity: activities[0],
        };
    }

    async getTopActiveUsers(limit: number = 10, startDate?: Date, endDate?: Date) {
        const where: any = {};
        if (startDate && endDate) {
            where.createdAt = Between(startDate, endDate);
        }

        const activities = await this.activityRepository.find({
            where,
            relations: ['user'],
        });

        const userStats: Record<number, { count: number; user?: any }> = {};

        activities.forEach((activity) => {
            if (!userStats[activity.telegramId]) {
                userStats[activity.telegramId] = { count: 0, user: activity.user };
            }
            userStats[activity.telegramId].count++;
        });

        const sorted = Object.entries(userStats)
            .map(([telegramId, data]) => ({
                telegramId: Number(telegramId),
                activityCount: data.count,
                user: data.user,
            }))
            .sort((a, b) => b.activityCount - a.activityCount)
            .slice(0, limit);

        return sorted;
    }

    async getInlineKeyboardStats(startDate?: Date, endDate?: Date) {
        const where: any = {};
        if (startDate && endDate) {
            where.createdAt = Between(startDate, endDate);
        }

        const inlineTypes = [
            ActivityType.NAME_MEANING_CLICK,
            ActivityType.PERSONAL_TAVSIYA_CLICK,
            ActivityType.OFERTA_CLICK,
            ActivityType.PAYME_CLICKED,
            ActivityType.CLICK_CLICKED,
        ];

        const stats: Record<string, number> = {};

        for (const type of inlineTypes) {
            const count = await this.activityRepository.count({
                where: {
                    ...where,
                    activityType: type,
                },
            });
            stats[type] = count;
        }

        return stats;
    }

    async getDailyStats(days: number = 7) {
        const stats: Array<{
            dateLabel: string;
            startDate: Date;
            endDate: Date;
            startCommands: number;
            nameMeaningClicks: number;
            personalTavsiyaClicks: number;
            ofertaClicks: number;
            paymeClicks: number;
            clickClicks: number;
        }> = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            const [
                startCommands,
                nameMeaningClicks,
                personalTavsiyaClicks,
                ofertaClicks,
                paymeClicks,
                clickClicks,
            ] = await Promise.all([
                this.activityRepository.count({
                    where: {
                        activityType: ActivityType.START_COMMAND,
                        createdAt: Between(date, nextDay),
                    },
                }),
                this.activityRepository.count({
                    where: {
                        activityType: ActivityType.NAME_MEANING_CLICK,
                        createdAt: Between(date, nextDay),
                    },
                }),
                this.activityRepository.count({
                    where: {
                        activityType: ActivityType.PERSONAL_TAVSIYA_CLICK,
                        createdAt: Between(date, nextDay),
                    },
                }),
                this.activityRepository.count({
                    where: {
                        activityType: ActivityType.OFERTA_CLICK,
                        createdAt: Between(date, nextDay),
                    },
                }),
                this.activityRepository.count({
                    where: {
                        activityType: ActivityType.PAYME_CLICKED,
                        createdAt: Between(date, nextDay),
                    },
                }),
                this.activityRepository.count({
                    where: {
                        activityType: ActivityType.CLICK_CLICKED,
                        createdAt: Between(date, nextDay),
                    },
                }),
            ]);

            stats.push({
                dateLabel: date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' }),
                startDate: date,
                endDate: nextDay,
                startCommands,
                nameMeaningClicks,
                personalTavsiyaClicks,
                ofertaClicks,
                paymeClicks,
                clickClicks,
            });
        }

        return stats;
    }
}
