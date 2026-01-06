export type AdminCopilotAction =
  | {
      type: 'set_config';
      key: string;
      value: string;
      reason?: string;
    }
  | {
      type: 'set_model';
      model: string;
      reason?: string;
    }
  | {
      type: 'set_overlay';
      scope: 'global' | 'prompt';
      promptId?: string;
      overlay: string;
      reason?: string;
    };

export type AdminCopilotMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  actions?: AdminCopilotAction[];
};

export type AdminCopilotRequest = {
  message: string;
  sessionId?: string;
  language?: 'pl' | 'en';
  range?: {
    start?: string;
    end?: string;
  };
};

export type AdminCopilotResponse = {
  sessionId: string;
  reply: string;
  actions?: AdminCopilotAction[];
};
