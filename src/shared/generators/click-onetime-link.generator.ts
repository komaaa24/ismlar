import { config } from '../config';

/**
 * Click bir martalik to'lov linkini yaratish
 *
 * @param userId - Foydalanuvchi ID
 * @param planId - Reja ID
 * @param amount - To'lov summasi (tiyin)
 * @returns To'lov linki
 */
export function generateClickOnetimeLink(
  userId: string,
  planId: string,
  amount: number,
): string {
  const CLICK_SERVICE_ID = config.CLICK_SERVICE_ID;
  const CLICK_MERCHANT_ID = config.CLICK_MERCHANT_ID;
  const CLICK_MERCHANT_USER_ID = config.CLICK_MERCHANT_USER_ID;
  const RETURN_URL = 'https://t.me/gbclilBot';

  // Click to'lov linki: transaction_param = userId.planId formatida
  const paymentUrl = new URL('https://my.click.uz/services/pay');

  paymentUrl.searchParams.set('service_id', CLICK_SERVICE_ID);
  paymentUrl.searchParams.set('merchant_id', CLICK_MERCHANT_ID);
  paymentUrl.searchParams.set('merchant_user_id', CLICK_MERCHANT_USER_ID);
  paymentUrl.searchParams.set('amount', amount.toString());
  paymentUrl.searchParams.set('transaction_param', `${userId}.${planId}`); // userId.planId
  paymentUrl.searchParams.set('return_url', RETURN_URL);

  return paymentUrl.toString();
}
