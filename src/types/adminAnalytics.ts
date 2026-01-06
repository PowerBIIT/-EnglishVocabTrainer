export type AnalyticsDatePoint = {
  date: string;
  events: number;
  aiRequests: number;
  aiTokens: number;
};

export type AdminAnalyticsOverviewResponse = {
  period: {
    start: string;
    end: string;
    days: number;
  };
  totals: {
    events: number;
    uniqueUsers: number;
    aiRequests: number;
    aiTokens: number;
    aiCost: number;
  };
  events: {
    byName: Array<{ eventName: string; count: number }>;
    byFeature: Array<{ feature: string; count: number }>;
    bySource: Array<{ source: string; count: number }>;
    pageViews: Array<{ feature: string; count: number }>;
  };
  vocabulary: {
    intakeSources: Array<{ source: string; count: number }>;
    wordsAdded: number;
    generated: number;
  };
  aiUsage: {
    byFeature: Array<{ feature: string; requests: number; tokens: number; cost: number }>;
    byModel: Array<{ model: string; requests: number; tokens: number; cost: number }>;
  };
  activity: {
    daily: AnalyticsDatePoint[];
  };
  recentEvents: Array<{
    id: string;
    userId: string;
    email: string | null;
    name: string | null;
    eventName: string;
    feature: string;
    source: string;
    createdAt: string;
  }>;
};

export type AdminAnalyticsUser = {
  id: string;
  email: string | null;
  name: string | null;
  events: number;
  lastEventAt: string | null;
  aiRequests: number;
  aiTokens: number;
  aiCost: number;
};

export type AdminAnalyticsUsersResponse = {
  period: {
    start: string;
    end: string;
    days: number;
  };
  page: number;
  limit: number;
  total: number;
  items: AdminAnalyticsUser[];
};
