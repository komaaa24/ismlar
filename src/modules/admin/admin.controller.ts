import { Controller, Post, Get, Body, Query, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AdminService } from './admin.service';

interface GrantSubscriptionDto {
    userId: string;
    adminTelegramId: string;
}

interface RevokeSubscriptionDto {
    userId: string;
    adminTelegramId: string;
}

@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('stats')
    async getStats(@Query('adminId') adminId: string) {
        if (!this.adminService.isAdmin(adminId)) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
        return await this.adminService.getStats();
    }

    @Post('grant-subscription')
    async grantSubscription(@Body() dto: GrantSubscriptionDto) {
        const success = await this.adminService.grantLifetimeSubscription(
            dto.userId,
            dto.adminTelegramId,
        );

        if (!success) {
            throw new HttpException('Failed to grant subscription', HttpStatus.BAD_REQUEST);
        }

        return { success: true, message: 'Lifetime subscription granted' };
    }

    @Post('revoke-subscription')
    async revokeSubscription(@Body() dto: RevokeSubscriptionDto) {
        const success = await this.adminService.revokeSubscription(
            dto.userId,
            dto.adminTelegramId,
        );

        if (!success) {
            throw new HttpException('Failed to revoke subscription', HttpStatus.BAD_REQUEST);
        }

        return { success: true, message: 'Subscription revoked' };
    }

    @Get('search-users')
    async searchUsers(
        @Query('query') query: string,
        @Query('adminId') adminId: string,
    ) {
        if (!this.adminService.isAdmin(adminId)) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        return await this.adminService.searchUsers(query);
    }

    @Get('user-by-telegram')
    async getUserByTelegram(
        @Query('telegramId') telegramId: string,
        @Query('adminId') adminId: string,
    ) {
        if (!this.adminService.isAdmin(adminId)) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        const user = await this.adminService.findUserByTelegramId(telegramId);
        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        return user;
    }
}
