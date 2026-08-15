import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Database, CheckCircle2, AlertTriangle, RefreshCw, Server } from 'lucide-react';
import { api, ApiError } from '../../services/api-client';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

interface ApiHealthStatusProps {
  refetchInterval?: number | false;
}

export const ApiHealthStatus: React.FC<ApiHealthStatusProps> = ({ refetchInterval = 30000 }) => {
  const healthQuery = useQuery({
    queryKey: ['api-health'],
    queryFn: api.getHealth,
    refetchInterval,
  });

  const readyQuery = useQuery({
    queryKey: ['api-ready'],
    queryFn: api.getReady,
    refetchInterval,
  });

  const isLivenessLoading = healthQuery.isLoading;
  const isReadinessLoading = readyQuery.isLoading;
  const isLoading = isLivenessLoading || isReadinessLoading;

  const isLivenessOk = !!healthQuery.data && healthQuery.isSuccess;
  const isReadinessOk = !!readyQuery.data && readyQuery.isSuccess;

  const handleRefetch = () => {
    healthQuery.refetch();
    readyQuery.refetch();
  };

  return (
    <Card className="p-6 overflow-hidden relative" variant="elevated">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-paper-200 dark:border-paper-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink-900 dark:text-paper-50 flex items-center gap-2">
              System Health & Readiness
              {isLoading ? (
                <Badge variant="warning">Checking...</Badge>
              ) : isLivenessOk && isReadinessOk ? (
                <Badge variant="success">All Systems Operational</Badge>
              ) : isLivenessOk ? (
                <Badge variant="warning">Degraded (DB Offline)</Badge>
              ) : (
                <Badge variant="danger">API Unavailable</Badge>
              )}
            </h3>
            <p className="text-xs text-ink-500 dark:text-paper-400 mt-0.5">
              Live monitoring of NestJS API backend and PostgreSQL persistence
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefetch}
          isLoading={isLoading}
          className="self-start sm:self-auto gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        {/* Liveness Probe Card */}
        <div className="p-4 rounded-lg bg-paper-100 dark:bg-paper-800/60 border border-paper-200 dark:border-paper-700/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-ink-800 dark:text-paper-100">
              <Activity className="w-4 h-4 text-brand-500" />
              <span>API Liveness (/api/v1/health)</span>
            </div>
            {isLivenessLoading ? (
              <span className="text-xs text-ink-400">Probing...</span>
            ) : isLivenessOk ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Alive
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" /> Offline
              </span>
            )}
          </div>

          <div className="mt-3 text-xs text-ink-600 dark:text-paper-400 space-y-1">
            {isLivenessOk && healthQuery.data ? (
              <>
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <span className="font-mono">{healthQuery.data.uptime}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Checked:</span>
                  <span className="font-mono">
                    {new Date(healthQuery.data.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </>
            ) : healthQuery.error ? (
              <div className="text-rose-600 dark:text-rose-400">
                Failed to reach API server. Ensure backend is running.
              </div>
            ) : (
              <div>Checking API process...</div>
            )}
          </div>
        </div>

        {/* Readiness Probe Card (DB) */}
        <div className="p-4 rounded-lg bg-paper-100 dark:bg-paper-800/60 border border-paper-200 dark:border-paper-700/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-ink-800 dark:text-paper-100">
              <Database className="w-4 h-4 text-brand-500" />
              <span>PostgreSQL Readiness (/api/v1/ready)</span>
            </div>
            {isReadinessLoading ? (
              <span className="text-xs text-ink-400">Probing...</span>
            ) : isReadinessOk ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" /> Unavailable
              </span>
            )}
          </div>

          <div className="mt-3 text-xs text-ink-600 dark:text-paper-400 space-y-1">
            {isReadinessOk && readyQuery.data ? (
              <>
                <div className="flex justify-between">
                  <span>Database Status:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    Connected
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Checked:</span>
                  <span className="font-mono">
                    {new Date(readyQuery.data.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </>
            ) : readyQuery.error ? (
              <div className="space-y-0.5">
                <div className="text-rose-600 dark:text-rose-400">
                  {readyQuery.error instanceof ApiError
                    ? `Error: ${readyQuery.error.message}`
                    : 'Database check failed'}
                </div>
                {readyQuery.error instanceof ApiError && readyQuery.error.requestId && (
                  <div className="font-mono text-[10px] text-ink-400">
                    Req ID: {readyQuery.error.requestId}
                  </div>
                )}
              </div>
            ) : (
              <div>Checking database connection...</div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
