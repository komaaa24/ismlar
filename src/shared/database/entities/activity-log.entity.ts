import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { UserEntity } from './user.entity';

export enum ActivityType {
    // Bot commands
    START_COMMAND = 'start_command',
    ADMIN_COMMAND = 'admin_command',

    // Inline keyboard actions
    INLINE_SEARCH = 'inline_search',
    NAME_MEANING_CLICK = 'name_meaning_click',
    PERSONAL_TAVSIYA_CLICK = 'personal_tavsiya_click',
    OFERTA_CLICK = 'oferta_click',
    TRENDS_CLICK = 'trends_click',
    FAVORITES_CLICK = 'favorites_click',

    // Payment actions
    PAYMENT_SCREEN_OPENED = 'payment_screen_opened',
    PAYME_CLICKED = 'payme_clicked',
    CLICK_CLICKED = 'click_clicked',
    PAYMENT_SUCCESS = 'payment_success',
    PAYMENT_FAILED = 'payment_failed',

    // Name search
    NAME_SEARCHED = 'name_searched',
    NAME_DETAIL_VIEWED = 'name_detail_viewed',

    // Favorites
    FAVORITE_ADDED = 'favorite_added',
    FAVORITE_REMOVED = 'favorite_removed',

    // Personalization
    PERSONALIZATION_STARTED = 'personalization_started',
    PERSONALIZATION_COMPLETED = 'personalization_completed',

    // Other
    MESSAGE_SENT = 'message_sent',
}

@Entity('activity_logs')
@Index(['userId', 'activityType', 'createdAt'])
@Index(['activityType', 'createdAt'])
export class ActivityLogEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', nullable: true })
    userId: string | null;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    @Column({ name: 'telegram_id', type: 'bigint' })
    telegramId: number;

    @Column({
        name: 'activity_type',
        type: 'varchar',
        length: 100,
    })
    activityType: ActivityType;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
