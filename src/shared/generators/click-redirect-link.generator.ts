import { config } from '../config';
import { buildMaskedPaymentLink } from '../utils/payment-link.util';
import { createSignedToken } from '../utils/signed-token.util';

export type ClickRedirectParams = {
  amount: number;
  planId: string;
  userId: string;
};
const CLICK_URL = `https://my.click.uz`;
const BOT_URL = 'https://t.me/gbclilBot';

function buildMerchantTransactionId(params: ClickRedirectParams): string {
  return `${params.userId}.${params.planId}`;
}

export function buildClickProviderUrl(params: ClickRedirectParams): string {
  const serviceId = config.CLICK_SERVICE_ID;
  const merchantId = config.CLICK_MERCHANT_ID;
  const merchantUserId = config.CLICK_MERCHANT_USER_ID;

  // Click API: transaction_param ga userId.planId formatida yuboramiz
  const merchantTransId = buildMerchantTransactionId(params);

  return `${CLICK_URL}/services/pay?service_id=${serviceId}&merchant_id=${merchantId}&merchant_user_id=${merchantUserId}&amount=${params.amount}&transaction_param=${encodeURIComponent(merchantTransId)}&return_url=${BOT_URL}`;
}

export function getClickRedirectLink(params: ClickRedirectParams) {
  const token = createSignedToken(params, config.PAYMENT_LINK_SECRET);
  const redirectUrl = buildMaskedPaymentLink(`click?token=${token}`);
  if (!redirectUrl) {
    return buildClickProviderUrl(params);
  }

  return redirectUrl;
}
