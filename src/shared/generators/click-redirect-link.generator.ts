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
  const transactionParam = sanitizeParam(params.userId);
  const planParam = sanitizeParam(params.planId);
  return `${CLICK_URL}/services/pay?service_id=${serviceId}&merchant_id=${merchantId}&amount=${intAmount}&transaction_param=${transactionParam}&additional_param3=${planParam}&additional_param4=${planParam}&return_url=${BOT_URL}`;
}

export function getClickRedirectLink(params: ClickRedirectParams) {
  return buildClickProviderUrl(params);
}

function sanitizeParam(value?: string): string {
  if (!value) {
    return '';
  }

  const cleaned = value.replace(/[^a-zA-Z0-9]/g, '');
  return cleaned || value;
}
