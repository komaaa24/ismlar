import { config } from '../config';
export type ClickRedirectParams = {
  amount: number;
  planId: string;
  userId: string;
};
const CLICK_URL = `https://my.click.uz`;
const BOT_URL = 'https://t.me/n17kamolBot';

function buildMerchantTransactionId(params: ClickRedirectParams): string {
  return `${params.userId}.${params.planId}`;
}

export function buildClickProviderUrl(params: ClickRedirectParams): string {
  const serviceId = config.CLICK_SERVICE_ID;
  const merchantId = config.CLICK_MERCHANT_ID;
  const merchantTransId = buildMerchantTransactionId(params);

  // amount har doim integer bo'lishi kerak
  const intAmount = Math.floor(Number(params.amount));
  const encodedPlanId = encodeURIComponent(params.planId);
  return `${CLICK_URL}/services/pay?service_id=${serviceId}&merchant_id=${merchantId}&amount=${intAmount}&transaction_param=${encodeURIComponent(
    merchantTransId,
  )}&additional_param3=${encodedPlanId}&additional_param4=${encodedPlanId}&return_url=${BOT_URL}`;
}

export function getClickRedirectLink(params: ClickRedirectParams) {
  return buildClickProviderUrl(params);
}
