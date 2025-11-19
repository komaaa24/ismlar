import { Buffer } from 'buffer';
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
  const merchantTransId = encodeMerchantTransaction(userId, planId);

  const paymentUrl = new URL('https://my.click.uz/services/pay');
  paymentUrl.searchParams.set('service_id', config.CLICK_SERVICE_ID);
  paymentUrl.searchParams.set('merchant_id', config.CLICK_MERCHANT_ID);
  paymentUrl.searchParams.set('amount', normalizedAmount.toString());
  paymentUrl.searchParams.set('transaction_param', merchantTransId);
  paymentUrl.searchParams.set('additional_param3', planId);
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

export function encodeMerchantTransaction(userId: string, planId: string): string {
  const payload = `${userId}.${planId}`;
  return Buffer.from(payload)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function decodeMerchantTransaction(
  merchantTransId?: string,
): { userId?: string; planId?: string } {
  if (!merchantTransId) {
    return {};
  }

  try {
    const padded =
      merchantTransId + Array((4 - (merchantTransId.length % 4 || 4)) % 4)
        .fill('=')
        .join('');
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    const [userId, planId] = decoded.split('.');
    return { userId, planId };
  } catch {
    const parts = merchantTransId.split('.');
    return {
      userId: parts[0],
      planId: parts[1],
    };
  }
}
