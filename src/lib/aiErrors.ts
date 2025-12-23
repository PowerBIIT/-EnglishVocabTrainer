export type GeminiErrorType =
  | 'invalid_api_key'
  | 'model_not_found'
  | 'rate_limited'
  | 'permission_denied'
  | 'bad_request'
  | 'unavailable'
  | 'timeout'
  | 'unknown';

export class GeminiApiError extends Error {
  status: number;
  statusText?: string;
  type: GeminiErrorType;

  constructor({
    message,
    status,
    statusText,
    type,
  }: {
    message: string;
    status: number;
    statusText?: string;
    type: GeminiErrorType;
  }) {
    super(message);
    this.name = 'GeminiApiError';
    this.status = status;
    this.statusText = statusText;
    this.type = type;
  }
}

export const classifyGeminiError = (
  status: number,
  statusText?: string
): GeminiErrorType => {
  const normalized = statusText?.toUpperCase();
  if (status === 401 || normalized === 'UNAUTHENTICATED') return 'invalid_api_key';
  if (status === 403 || normalized === 'PERMISSION_DENIED') return 'permission_denied';
  if (status === 404 || normalized === 'NOT_FOUND') return 'model_not_found';
  if (status === 429 || normalized === 'RESOURCE_EXHAUSTED') return 'rate_limited';
  if (status === 400 || normalized === 'INVALID_ARGUMENT') return 'bad_request';
  if (status === 408 || status === 504 || normalized === 'DEADLINE_EXCEEDED') {
    return 'timeout';
  }
  if (status >= 500 || normalized === 'UNAVAILABLE') return 'unavailable';
  return 'unknown';
};

export const createGeminiTimeoutError = () =>
  new GeminiApiError({
    message: 'Gemini API timeout',
    status: 504,
    statusText: 'DEADLINE_EXCEEDED',
    type: 'timeout',
  });

type AiErrorResponse = {
  status: number;
  body: {
    error: string;
    detail?: string;
    statusText?: string;
  };
};

const GEMINI_ERROR_MAP: Record<GeminiErrorType, { error: string; status: number }> = {
  invalid_api_key: { error: 'ai_invalid_key', status: 502 },
  permission_denied: { error: 'ai_permission_denied', status: 502 },
  model_not_found: { error: 'ai_model_not_found', status: 502 },
  rate_limited: { error: 'ai_rate_limited', status: 429 },
  bad_request: { error: 'ai_bad_request', status: 400 },
  unavailable: { error: 'ai_unavailable', status: 503 },
  timeout: { error: 'ai_timeout', status: 504 },
  unknown: { error: 'ai_failed', status: 502 },
};

export const mapGeminiError = (error: unknown): AiErrorResponse | null => {
  if (!(error instanceof GeminiApiError)) return null;
  const mapped = GEMINI_ERROR_MAP[error.type] ?? GEMINI_ERROR_MAP.unknown;
  const body: AiErrorResponse['body'] = { error: mapped.error };

  if (process.env.NODE_ENV !== 'production') {
    body.detail = error.message;
    if (error.statusText) {
      body.statusText = error.statusText;
    }
  }

  return { status: mapped.status, body };
};
