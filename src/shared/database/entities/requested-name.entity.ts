import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

@Entity('requested_names')
@Index(['name'], { unique: false })
export class RequestedNameEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 120 })
    name: string;

    @Column({ type: 'varchar', length: 120 })
    normalizedName: string;

    @Column({ type: 'int', default: 1 })
    requestCount: number;

    @Column({ type: 'bigint', nullable: true })
    lastRequestedBy?: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    lastRequestedByUsername?: string;

    @Column({ type: 'boolean', default: false })
    isProcessed: boolean;

    @Column({ type: 'text', nullable: true })
    adminNotes?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
