// AI Analytics Types

export type AiAnalyticsPeriod = '7d' | '30d' | '90d';

export interface AiTokenStatsResponse {
  period: {
    start: string;
    end: string;
  };
  totals: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    actualCost: number;
    successRate: number;
    avgDurationMs: number;
  };
  byModel: Array<{
    model: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  }>;
  byFeature: Array<{
    feature: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
    errorRate: number;
  }>;
  topUsers: Array<{
    userId: string;
    email: string | null;
    requests: number;
    totalTokens: number;
    cost: number;
  }>;
}

export interface AiTrendPoint {
  date: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  uniqueUsers: number;
}

export interface AiTrendsResponse {
  period: {
    start: string;
    end: string;
  };
  daily: AiTrendPoint[];
  totals: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
    uniqueUsers: number;
  };
}

export interface AiFeatureBreakdown {
  feature: string;
  requests: number;
  successCount: number;
  errorCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  avgDurationMs: number;
  errorRate: number;
  languagePairs: Array<{
    pair: string;
    requests: number;
    tokens: number;
  }>;
}

export interface AiFeaturesResponse {
  period: {
    start: string;
    end: string;
  };
  features: AiFeatureBreakdown[];
}

// Revenue Chat Types

export interface RevenueContext {
  mrr: number;
  arr: number;
  activeSubscribers: number;
  trialConversion: number;
  churnRate: number;
  aiCostPerUser: number;
  tokens: {
    input: number;
    output: number;
    cost: number;
  };
  topFeatures: Array<{
    name: string;
    usage: number;
    cost: number;
  }>;
}

export interface RevenueChatRequest {
  message: string;
  sessionId?: string;
}

export interface RevenueRecommendation {
  type: 'pricing' | 'cost' | 'growth';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface RevenueChatResponse {
  sessionId: string;
  response: string;
  recommendations?: RevenueRecommendation[];
}

export interface RevenueChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface RevenueChatHistoryResponse {
  sessionId: string;
  messages: RevenueChatMessage[];
}
