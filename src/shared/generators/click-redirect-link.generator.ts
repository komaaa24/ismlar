import { createHash } from 'crypto';
import { config } from '../config';
import { shortenUuid } from './click-onetime-link.generator';
export type ClickRedirectParams = {
  amount: number;
  planId: string;
  userId: string;
};
const CLICK_URL = `https://my.click.uz`;
const BOT_URL = 'https://t.me/n17kamolBot';

export function buildClickProviderUrl(params: ClickRedirectParams): string {
  const serviceId = config.CLICK_SERVICE_ID;
  const merchantId = config.CLICK_MERCHANT_ID;
  const merchantTransId = buildOrderId(params.userId, params.planId);
  const intAmount = Math.floor(Number(params.amount));
  const planCode = (params.planId || '').replace(/\s+/g, '').toLowerCase();
  return `${CLICK_URL}/services/pay?service_id=${serviceId}&merchant_id=${merchantId}&amount=${intAmount}&transaction_param=${merchantTransId}&additional_param1=${shortenUuid(
    params.userId,
  )}&additional_param2=${shortenUuid(
    params.planId,
  )}&additional_param3=${encodeURIComponent(
    planCode,
  )}&return_url=${BOT_URL}`;
}

export function getClickRedirectLink(params: ClickRedirectParams) {
  return buildClickProviderUrl(params);
}

function buildOrderId(userId: string, planId: string): string {
  const timestamp = Date.now().toString();
  const seed = `${userId}.${planId}.${timestamp}.${Math.random()}`;
  const hash = createHash('md5').update(seed).digest('hex');
  return hash.slice(0, 24);
}
