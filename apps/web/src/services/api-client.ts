import {
  ApiResponse,
  ApiErrorResponse,
  HealthCheckResponse,
  ReadinessCheckResponse,
} from '@bookflow/shared-types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public requestId?: string;
  public errors?: Array<{ field?: string; message: string }>;

  constructor(errorResponse: Partial<ApiErrorResponse>) {
    super(errorResponse.message || 'An API error occurred');
    this.name = 'ApiError';
    this.statusCode = errorResponse.statusCode || 500;
    this.code = errorResponse.code || 'UNKNOWN_ERROR';
    this.requestId = errorResponse.requestId;
    this.errors = errorResponse.errors;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const responseData = isJson ? await response.json() : null;

  if (!response.ok) {
    if (responseData && typeof responseData === 'object') {
      throw new ApiError(responseData as Partial<ApiErrorResponse>);
    }
    throw new ApiError({
      statusCode: response.status,
      code: 'HTTP_ERROR',
      message: response.statusText || 'Request failed',
    });
  }

  // If response is wrapped in { data: ... }, unwrap it or return it
  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    return (responseData as ApiResponse<T>).data;
  }

  return responseData as T;
}

export const api = {
  getHealth: () => request<HealthCheckResponse>('/health'),
  getReady: () => request<ReadinessCheckResponse>('/ready'),
};
