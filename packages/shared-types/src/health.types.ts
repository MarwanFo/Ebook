/**
 * Health and Readiness API Contracts.
 */

export interface HealthCheckResponse {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

export interface ReadinessCheckResponse {
  status: 'ok';
  database: 'connected';
  timestamp: string;
}
