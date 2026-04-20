import { env } from '../../config/env';
import { probeDatabaseConnection } from '../../data/prisma/client';

export interface HealthCheckPayload {
  ok: boolean;
  status: 'ok' | 'degraded';
  service: string;
  environment: string;
  timestamp: string;
  checks: {
    app: {
      status: 'up';
    };
    db: {
      status: 'up' | 'down';
    };
  };
}

export interface HealthCheckResult {
  payload: HealthCheckPayload;
  statusCode: number;
  error?: unknown;
}

const serviceName = 'garage-mechanic-backend';

export function buildHealthCheckPayload(params: {
  dbStatus: 'up' | 'down';
  timestamp?: Date;
  environment?: string;
}): HealthCheckPayload {
  const timestamp = (params.timestamp ?? new Date()).toISOString();
  const environment = params.environment ?? env.NODE_ENV;
  const isHealthy = params.dbStatus === 'up';

  return {
    ok: isHealthy,
    status: isHealthy ? 'ok' : 'degraded',
    service: serviceName,
    environment,
    timestamp,
    checks: {
      app: {
        status: 'up'
      },
      db: {
        status: params.dbStatus
      }
    }
  };
}

export async function readHealthCheck(): Promise<HealthCheckResult> {
  try {
    await probeDatabaseConnection();
    return {
      statusCode: 200,
      payload: buildHealthCheckPayload({ dbStatus: 'up' })
    };
  } catch (error) {
    return {
      statusCode: 503,
      payload: buildHealthCheckPayload({ dbStatus: 'down' }),
      error
    };
  }
}
