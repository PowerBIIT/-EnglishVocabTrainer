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
    description:
      'Caps how many users can be ACTIVE at once. Helps control load and cost; admins/VIP bypass it and existing active users keep access.',
    dataType: 'number',
    defaultValue: numberDefault(DEFAULT_MAX_ACTIVE_USERS),
  },
  {
    key: 'FREE_AI_REQUESTS_PER_MONTH',
    label: 'FREE requests/month',
    description:
      'Monthly AI request quota for FREE plan. Controls free usage and cost; resets monthly (UTC).',
    dataType: 'number',
    defaultValue: numberDefault(DEFAULT_FREE_LIMITS.maxRequests),
  },
  {
    key: 'FREE_AI_UNITS_PER_MONTH',
    label: 'FREE tokens/month',
    description:
      'Monthly token (unit) quota for FREE plan. Controls cost-heavy usage; resets monthly (UTC).',
    dataType: 'number',
    defaultValue: numberDefault(DEFAULT_FREE_LIMITS.maxUnits),
  },
  {
    key: 'PRO_AI_REQUESTS_PER_MONTH',
    label: 'PRO requests/month',
    description:
      'Monthly AI request quota for PRO plan. Prevents runaway usage and protects infrastructure; resets monthly (UTC).',
    dataType: 'number',
    defaultValue: numberDefault(DEFAULT_PRO_LIMITS.maxRequests),
  },
  {
    key: 'PRO_AI_UNITS_PER_MONTH',
    label: 'PRO tokens/month',
    description:
      'Monthly token (unit) quota for PRO plan. Protects cost ceiling; resets monthly (UTC).',
    dataType: 'number',
    defaultValue: numberDefault(DEFAULT_PRO_LIMITS.maxUnits),
  },
  {
    key: 'GLOBAL_AI_REQUESTS_PER_MONTH',
    label: 'Global requests/month',
    description:
      'Global monthly request cap across all users. Protects system-wide load/cost; when exceeded, AI is blocked for everyone until reset.',
    dataType: 'number',
    defaultValue: numberDefault(DEFAULT_GLOBAL_LIMITS.maxRequests),
  },
  {
    key: 'GLOBAL_AI_UNITS_PER_MONTH',
    label: 'Global tokens/month',
    description:
      'Global monthly token cap across all users. Protects system-wide cost; when exceeded, AI is blocked for everyone until reset.',
    dataType: 'number',
    defaultValue: numberDefault(DEFAULT_GLOBAL_LIMITS.maxUnits),
  },
  {
    key: 'AI_COST_ALERT_THRESHOLD_USD',
    label: 'AI cost alert threshold (USD)',
    description:
      'Send alert when actual or projected monthly AI cost reaches this USD amount. Early warning for budget control.',
    dataType: 'number',
    defaultValue: '0',
  },
  {
    key: 'AI_COST_HARD_LIMIT_USD',
    label: 'AI cost hard limit (USD)',
    description:
      'Hard stop for all AI requests once monthly cost reaches this USD amount (including admins). Use 0 or unlimited to disable.',
    dataType: 'number',
    defaultValue: '0',
  },
  {
    key: 'AI_COST_ALERT_CHECK_INTERVAL_MINUTES',
    label: 'AI cost alert check interval (minutes)',
    description:
      'Minimum minutes between cost alert checks. Higher values reduce alert noise and DB reads; 0 checks every request.',
    dataType: 'number',
    defaultValue: '15',
  },
  {
    key: 'AI_COST_ALERT_WEBHOOK_URL',
    label: 'AI cost alert webhook URL',
    description: 'Optional webhook URL to receive AI cost alerts as JSON. Leave empty to disable.',
    dataType: 'string',
    defaultValue: '',
  },
  {
    key: 'EMAIL_VERIFICATION_CLEANUP_ALERT_THRESHOLD',
    label: 'Email cleanup alert threshold',
    description:
      'Minimum deletions in one cleanup run to trigger an alert. Helps catch unusual spikes.',
    dataType: 'number',
    defaultValue: '10',
  },
  {
    key: 'EMAIL_VERIFICATION_CLEANUP_ALERT_SPIKE_MULTIPLIER',
    label: 'Email cleanup spike multiplier',
    description:
      'Alert when deletions exceed baseline average by this multiplier. Use to detect sudden surges.',
    dataType: 'number',
    defaultValue: '3',
  },
  {
    key: 'EMAIL_VERIFICATION_CLEANUP_ALERT_WINDOW',
    label: 'Email cleanup baseline window',
    description:
      'Number of recent cleanup runs used for baseline average. Larger window smooths noise.',
    dataType: 'number',
    defaultValue: '14',
  },
  {
    key: 'EMAIL_VERIFICATION_CLEANUP_ALERT_COOLDOWN_HOURS',
    label: 'Email cleanup alert cooldown (hours)',
    description: 'Minimum hours between cleanup alerts. Prevents repeated notifications during bursts.',
    dataType: 'number',
    defaultValue: '24',
  },
  {
    key: 'ALLOWLIST_EMAILS',
    label: 'VIP emails (bypass limit)',
    description:
      'VIP emails that bypass MAX_ACTIVE_USERS capacity gate. Useful for internal/test access; does not bypass AI cost hard limit.',
    dataType: 'list',
    defaultValue: '',
  },
  {
    key: 'STRIPE_PRO_MONTHLY_PRICE_ID',
    label: 'Stripe Monthly Price ID',
    description: 'Stripe Price ID used for the PRO monthly checkout. Update when you change the live price.',
    dataType: 'string',
    defaultValue: '',
  },
  {
    key: 'STRIPE_PRO_ANNUAL_PRICE_ID',
    label: 'Stripe Annual Price ID',
    description: 'Stripe Price ID used for the PRO annual checkout. Update when you change the live price.',
    dataType: 'string',
    defaultValue: '',
  },
];
