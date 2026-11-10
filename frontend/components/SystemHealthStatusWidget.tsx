"use client";

import React, { useState, useEffect } from "react";

export interface SubsystemStatus {
  status: "healthy" | "degraded" | "unhealthy" | "skipped";
  latencyMs?: number;
  error?: string;
}

export interface SystemHealthData {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  timestamp: string;
  checks: {
    database?: SubsystemStatus;
    horizon?: SubsystemStatus;
    sorobanRpc?: SubsystemStatus;
  };
}

export interface SystemHealthStatusWidgetProps {
  initialData?: SystemHealthData;
  healthEndpoint?: string;
  refreshIntervalMs?: number;
  className?: string;
}

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return "0m";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const SystemHealthStatusWidget: React.FC<SystemHealthStatusWidgetProps> = ({
  initialData,
  healthEndpoint = "/api/health/synthetic",
  refreshIntervalMs = 30000,
  className = "",
}) => {
  const [data, setData] = useState<SystemHealthData | null>(initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      setLoading(true);
      try {
        const res = await fetch(healthEndpoint);
        if (!res.ok && res.status !== 503) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        if (isMounted) {
          setData(json);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to query system health");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (!initialData) {
      fetchHealth();
    }

    const interval = setInterval(fetchHealth, refreshIntervalMs);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [initialData, healthEndpoint, refreshIntervalMs]);

  const overallStatus = data?.status || (error ? "unhealthy" : "healthy");

  return (
    <section
      aria-label="System Health Status"
      className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              overallStatus === "healthy"
                ? "bg-emerald-500 animate-pulse"
                : overallStatus === "degraded"
                ? "bg-amber-500"
                : "bg-rose-500"
            }`}
            aria-hidden="true"
          />
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            System Status
          </h4>
        </div>

        <span
          data-testid="overall-status-badge"
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            overallStatus === "healthy"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              : overallStatus === "degraded"
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
          }`}
        >
          {overallStatus === "healthy"
            ? "Operational"
            : overallStatus === "degraded"
            ? "Degraded"
            : "Outage"}
        </span>
      </div>

      {error ? (
        <div data-testid="health-error-toast" className="text-xs text-rose-600 dark:text-rose-400">
          Probe connection failed: {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
          <div
            data-testid="subsystem-database"
            className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
          >
            <span className="text-gray-600 dark:text-gray-400">PostgreSQL</span>
            <span className="font-mono font-medium text-gray-900 dark:text-white">
              {data?.checks?.database?.latencyMs !== undefined
                ? `${data.checks.database.latencyMs}ms`
                : "OK"}
            </span>
          </div>

          <div
            data-testid="subsystem-horizon"
            className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
          >
            <span className="text-gray-600 dark:text-gray-400">Horizon Node</span>
            <span className="font-mono font-medium text-gray-900 dark:text-white">
              {data?.checks?.horizon?.latencyMs !== undefined
                ? `${data.checks.horizon.latencyMs}ms`
                : "OK"}
            </span>
          </div>

          <div
            data-testid="subsystem-soroban"
            className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
          >
            <span className="text-gray-600 dark:text-gray-400">Soroban RPC</span>
            <span className="font-mono font-medium text-gray-900 dark:text-white">
              {data?.checks?.sorobanRpc?.latencyMs !== undefined
                ? `${data.checks.sorobanRpc.latencyMs}ms`
                : "OK"}
            </span>
          </div>
        </div>
      )}

      {data?.uptime !== undefined && (
        <div className="mt-3 text-[10px] text-gray-400 text-right">
          Uptime: <span data-testid="uptime-text">{formatUptime(data.uptime)}</span>
        </div>
      )}
    </section>
  );
};

