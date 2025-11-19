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

  const paymentUrl = new URL('https://my.click.uz/services/pay');
  paymentUrl.searchParams.set('service_id', config.CLICK_SERVICE_ID);
  paymentUrl.searchParams.set('merchant_id', config.CLICK_MERCHANT_ID);
  paymentUrl.searchParams.set('amount', normalizedAmount.toString());
  paymentUrl.searchParams.set('transaction_param', userId);
  paymentUrl.searchParams.set('additional_param3', planId);
  paymentUrl.searchParams.set(
    'additional_param4',
    options?.planCode ?? planId,
  );
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
