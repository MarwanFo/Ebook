import {
  ApiResponse,
  ApiErrorResponse,
  HealthCheckResponse,
  ReadinessCheckResponse,
} from '@bookflow/shared-types';
import { useAuthStore } from '../features/auth/stores/auth-store';

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

// Single-flight refresh mutex to synchronize concurrent 401s
let refreshPromise: Promise<string> | null = null;

async function rawRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    credentials: 'include',
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

  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    return (responseData as ApiResponse<T>).data;
  }

  return responseData as T;
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isAuthEndpoint =
    endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/register') ||
    endpoint.includes('/auth/refresh');

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  const token = useAuthStore.getState().accessToken;
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    return await rawRequest<T>(endpoint, { ...options, headers });
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401 && !isAuthEndpoint) {
      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            try {
              const res = await rawRequest<{ accessToken: string }>('/auth/refresh', {
                method: 'POST',
              });
              useAuthStore.getState().setAccessToken(res.accessToken);
              return res.accessToken;
            } catch (refreshErr) {
              useAuthStore.getState().setUnauthenticated();
              throw refreshErr;
            } finally {
              refreshPromise = null;
            }
          })();
        }

        const newAccessToken = await refreshPromise;
        headers['Authorization'] = `Bearer ${newAccessToken}`;
        return await rawRequest<T>(endpoint, { ...options, headers });
      } catch {
        throw error;
      }
    }
    throw error;
  }
}

export const api = {
  getHealth: () => request<HealthCheckResponse>('/health'),
  getReady: () => request<ReadinessCheckResponse>('/ready'),
};
