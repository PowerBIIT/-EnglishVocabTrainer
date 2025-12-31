export type AdminPrice = {
  id: string;
  productId: string;
  productName: string;
  unitAmount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year' | null;
  intervalCount: number;
  active: boolean;
  nickname: string | null;
  created: number;
  isActiveMonthly: boolean;
  isActiveAnnual: boolean;
};

export type AdminCoupon = {
  id: string;
  name: string | null;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths: number | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  redeemBy: number | null;
  valid: boolean;
  created: number;
};

export type AdminProduct = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

export type CreatePriceData = {
  productId: string;
  unitAmount: number;
  currency: string;
  interval: 'month' | 'year';
  nickname?: string;
};

export type CreateCouponData = {
  name: string;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths?: number;
  maxRedemptions?: number;
  redeemBy?: number;
};

export type ActivePriceIds = {
  monthly: string;
  annual: string;
};
