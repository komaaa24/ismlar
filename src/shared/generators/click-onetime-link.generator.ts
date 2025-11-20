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
};

export function generateClickOnetimeLink(
  userId: string,
  planId: string,
  amount: number,
  options?: ClickLinkOptions,
): string {
  const normalizedAmount = normalizeAmount(amount);
  const planCode = (options?.planCode ?? planId).replace(/\s+/g, '').toLowerCase();
  const merchantTransId = compactUuid(userId);
  const planToken = compactUuid(planId);

  const paymentUrl = new URL('https://my.click.uz/services/pay');
  paymentUrl.searchParams.set('service_id', config.CLICK_SERVICE_ID);
  paymentUrl.searchParams.set('merchant_id', config.CLICK_MERCHANT_ID);
  paymentUrl.searchParams.set('amount', normalizedAmount.toString());
  paymentUrl.searchParams.set('transaction_param', merchantTransId);
  paymentUrl.searchParams.set('additional_param3', planToken);
  paymentUrl.searchParams.set('additional_param4', planCode);
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

export function expandCompactUuid(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.replace(/[^0-9a-fA-F]/g, '');
  if (normalized.length !== 32) {
    return value;
  }
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(
    12,
    16,
  )}-${normalized.slice(16, 20)}-${normalized.slice(20)}`.toLowerCase();
}

function compactUuid(value: string): string {
  const normalized = value.replace(/[^0-9a-fA-F]/g, '');
  if (normalized.length === 32) {
    return normalized;
  }
  return value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
}
