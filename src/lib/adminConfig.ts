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
  dataType: 'number' | 'list';
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
    label: 'FREE units/month',
    description: 'AI units allowed for FREE plan per month.',
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
    label: 'PRO units/month',
    description: 'AI units allowed for PRO plan per month.',
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
    label: 'Global units/month',
    description: 'Global AI unit cap per month.',
    dataType: 'number',
    defaultValue: numberDefault(DEFAULT_GLOBAL_LIMITS.maxUnits),
  },
  {
    key: 'ALLOWLIST_EMAILS',
    label: 'Allowlist emails',
    description: 'Comma, space, or semicolon separated list of allowed emails.',
    dataType: 'list',
    defaultValue: '',
  },
];
