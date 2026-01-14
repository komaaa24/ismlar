import 'reflect-metadata';
import { In } from 'typeorm';
import { initializeDatabase } from '../shared/database/typeorm.config';
import {
  TransactionEntity,
  UserPaymentEntity,
} from '../shared/database/entities';
import {
  TransactionStatus,
  PaymentStatus,
  PaymentProvider,
} from '../shared/database/entities/enums';

const providerToMethod = (provider: PaymentProvider): string => {
  switch (provider) {
    case PaymentProvider.CLICK:
      return 'click';
    case PaymentProvider.PAYME:
      return 'payme';
    case PaymentProvider.UZUM:
      return 'uzum';
    case PaymentProvider.UZCARD:
      return 'uzcard';
    default:
      return 'unknown';
  }
};

async function migrate() {
  const dataSource = await initializeDatabase();
  const transactionRepo = dataSource.getRepository(TransactionEntity);
  const userPaymentRepo = dataSource.getRepository(UserPaymentEntity);

  const paidTransactions = await transactionRepo.find({
    where: { status: TransactionStatus.PAID },
  });

  const transIds = paidTransactions
    .map((t) => t.transId)
    .filter((id): id is string => Boolean(id));

  const existingPayments = transIds.length
    ? await userPaymentRepo.find({
        where: { transactionId: In(transIds) },
      })
    : [];

  const existingSet = new Set(
    existingPayments
      .map((p) => p.transactionId)
      .filter((id): id is string => Boolean(id)),
  );

  const toInsert = paidTransactions
    .filter((t) => !t.transId || !existingSet.has(t.transId))
    .map((t) =>
      userPaymentRepo.create({
        userId: t.userId,
        subscriptionId: t.planId,
        amount: Number(t.amount),
        currency: 'UZS',
        paymentMethod: providerToMethod(t.provider),
        transactionId: t.transId,
        status: PaymentStatus.COMPLETED,
        paymentDate: t.performTime || t.createdAt,
      }),
    );

  if (!toInsert.length) {
    console.log('✅ No new payments to migrate.');
    return;
  }

  await userPaymentRepo.save(toInsert);
  console.log(
    `✅ Migrated ${toInsert.length} payments into user_payments (from ${paidTransactions.length} paid transactions).`,
  );
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
