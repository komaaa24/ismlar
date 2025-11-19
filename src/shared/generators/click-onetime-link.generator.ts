import { createHash } from 'crypto';
import { Buffer } from 'buffer';
import { createHash } from 'crypto';
import { config } from '../config';

const RETURN_URL =
  process.env.BOT_URL?.trim() || 'https://t.me/n17kamolBot';

/**
 * Click bir martalik to'lov linkini yaratish.
 * Click shop API integer summani talab qiladi, shuning uchun doimiy
 * tarzda butun so'm jo'natiladi.
 */
type ClickLinkOptions = {
  planCode?: string;
  telegramId?: number;
  transactionParam?: string;
};

export function generateClickOnetimeLink(
  userId: string,
  planId: string,
  amount: number,
  options?: ClickLinkOptions,
): string {
  const normalizedAmount = normalizeAmount(amount);
  const planCode = (options?.planCode ?? planId).replace(/\s+/g, '').toLowerCase();
  const orderId =
    options?.transactionParam ??
    buildTransactionParam(options?.telegramId, planCode, userId, planId);

  const paymentUrl = new URL('https://my.click.uz/services/pay');
  paymentUrl.searchParams.set('service_id', config.CLICK_SERVICE_ID);
  paymentUrl.searchParams.set('merchant_id', config.CLICK_MERCHANT_ID);
  paymentUrl.searchParams.set('amount', normalizedAmount.toString());
  paymentUrl.searchParams.set('transaction_param', orderId);
  paymentUrl.searchParams.set('additional_param1', shortenUuid(userId));
  paymentUrl.searchParams.set('additional_param2', shortenUuid(planId));
  paymentUrl.searchParams.set('additional_param3', planCode);
  paymentUrl.searchParams.set('return_url', RETURN_URL);

  return paymentUrl.toString();
}

function normalizeAmount(amount: number): number {
  const parsed = Math.floor(Number(amount));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Invalid Click amount');
  }

  return parsed;
}

function buildTransactionParam(
  telegramId: number | undefined,
  planCode: string,
  fallbackUserId: string,
  fallbackPlanId: string,
): string {
  if (telegramId) {
    return `${telegramId}.${planCode}`;
  }

  const compactUser = fallbackUserId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  const compactPlan = fallbackPlanId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  if (compactUser && compactPlan) {
    return `${compactUser}.${compactPlan}`;
  }

  const timestamp = Date.now().toString();
  const seed = `${fallbackUserId}.${fallbackPlanId}.${timestamp}.${Math.random()}`;
  const hash = createHash('md5').update(seed).digest('hex');
  return hash.slice(0, 24);
}

export function shortenUuid(id: string): string {
  const normalized = id.replace(/-/g, '');
  if (!/^[0-9a-fA-F]{32}$/.test(normalized)) {
    return id;
  }
  const buffer = Buffer.from(normalized, 'hex');
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function expandShortUuid(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  if (/^[0-9a-fA-F-]{36}$/.test(value)) {
    return value;
  }

  const padded =
    value + Array((4 - (value.length % 4 || 4)) % 4).fill('=').join('');
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const buffer = Buffer.from(base64, 'base64');
    const hex = buffer.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
      12,
      16,
    )}-${hex.slice(16, 20)}-${hex.slice(20)}`.toLowerCase();
  } catch {
    return value;
  }
}
