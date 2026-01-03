import {
  DEFAULT_FREE_LIMITS,
  DEFAULT_GLOBAL_LIMITS,
  DEFAULT_MAX_ACTIVE_USERS,
  DEFAULT_PRO_LIMITS,
} from '@/lib/configDefaults';

export type AdminConfigField = {
  key: string;
  label: string;
  description: string;
  dataType: 'number' | 'list' | 'string';
  defaultValue: string;
};

const numberDefault = (value: number) =>
  value === Number.POSITIVE_INFINITY ? 'unlimited' : String(value);

export const ADMIN_CONFIG_FIELDS: AdminConfigField[] = [
  {
    key: 'MAX_ACTIVE_USERS',
    label: 'Max active users',
    description: 'Maximum number of active users (-1 or unlimited for no cap).',
    dataType: 'number',
    defaultValue: numberDefault(DEFAULT_MAX_ACTIVE_USERS),
  },
  {
    key: 'FREE_AI_REQUESTS_PER_MONTH',
    label: 'FREE requests/month',
    description: 'AI requests allowed for FREE plan per month.',
    dataType: 'number',
    defaultValue: numberDefault(DEFAULT_FREE_LIMITS.maxRequests),
  },
  {
    key: 'FREE_AI_UNITS_PER_MONTH',
    label: 'FREE tokens/month',
    description: 'AI tokens allowed for FREE plan per month.',
    dataType: 'number',
    defaultValue: numberDefault(DEFAULT_FREE_LIMITS.maxUnits),
  },
  {
    key: 'PRO_AI_REQUESTS_PER_MONTH',
    label: 'PRO requests/month',
    description: 'AI requests allowed for PRO plan per month.',
    dataType: 'number',
    defaultValue: numberDefault(DEFAULT_PRO_LIMITS.maxRequests),
  },
  {
    key: 'PRO_AI_UNITS_PER_MONTH',
    label: 'PRO tokens/month',
    description: 'AI tokens allowed for PRO plan per month.',
    dataType: 'number',
    defaultValue: numberDefault(DEFAULT_PRO_LIMITS.maxUnits),
  },
  {
    key: 'GLOBAL_AI_REQUESTS_PER_MONTH',
    label: 'Global requests/month',
    description: 'Global AI request cap per month.',
    dataType: 'number',
    defaultValue: numberDefault(DEFAULT_GLOBAL_LIMITS.maxRequests),
  },
  {
    key: 'GLOBAL_AI_UNITS_PER_MONTH',
    label: 'Global tokens/month',
    description: 'Global AI token cap per month.',
    dataType: 'number',
    defaultValue: numberDefault(DEFAULT_GLOBAL_LIMITS.maxUnits),
  },
  {
    key: 'AI_COST_ALERT_THRESHOLD_USD',
    label: 'AI cost alert threshold (USD)',
    description: 'Send an alert when monthly AI cost exceeds this amount (USD).',
    dataType: 'number',
    defaultValue: '0',
  },
  {
    key: 'AI_COST_ALERT_CHECK_INTERVAL_MINUTES',
    label: 'AI cost alert check interval (minutes)',
    description: 'Minimum interval between alert checks. Use 0 to check every request.',
    dataType: 'number',
    defaultValue: '15',
  },
  {
    key: 'AI_COST_ALERT_WEBHOOK_URL',
    label: 'AI cost alert webhook URL',
    description: 'Webhook URL to receive AI cost alerts as JSON payloads.',
    dataType: 'string',
    defaultValue: '',
  },
  {
    key: 'ALLOWLIST_EMAILS',
    label: 'VIP emails (bypass limit)',
    description:
      'VIP emails that bypass MAX_ACTIVE_USERS limit. Comma/space/semicolon separated. Leave empty if not needed.',
    dataType: 'list',
    defaultValue: '',
  },
  {
    key: 'STRIPE_PRO_MONTHLY_PRICE_ID',
    label: 'Stripe Monthly Price ID',
    description: 'Active Stripe Price ID for PRO monthly subscription.',
    dataType: 'string',
    defaultValue: '',
  },
  {
    key: 'STRIPE_PRO_ANNUAL_PRICE_ID',
    label: 'Stripe Annual Price ID',
    description: 'Active Stripe Price ID for PRO annual subscription.',
    dataType: 'string',
    defaultValue: '',
  },
];
