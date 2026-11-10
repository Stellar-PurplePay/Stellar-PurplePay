import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import {
  SystemHealthStatusWidget,
  SystemHealthData,
} from "../components/SystemHealthStatusWidget";

describe("SystemHealthStatusWidget", () => {
  const sampleData: SystemHealthData = {
    status: "healthy",
    uptime: 90000, // 1d 1h
    timestamp: "2026-11-10T00:00:00Z",
    checks: {
      database: { status: "healthy", latencyMs: 12 },
      horizon: { status: "healthy", latencyMs: 45 },
      sorobanRpc: { status: "healthy", latencyMs: 88 },
    },
  };

  it("renders operational badge, subsystem latencies, and uptime", () => {
    render(<SystemHealthStatusWidget initialData={sampleData} />);

    expect(screen.getByRole("region")).toBeInTheDocument();
    expect(screen.getByTestId("overall-status-badge")).toHaveTextContent("Operational");
    expect(screen.getByTestId("subsystem-database")).toHaveTextContent("12ms");
    expect(screen.getByTestId("subsystem-horizon")).toHaveTextContent("45ms");
    expect(screen.getByTestId("subsystem-soroban")).toHaveTextContent("88ms");
    expect(screen.getByTestId("uptime-text")).toHaveTextContent("1d 1h");
  });

  it("renders degraded badge when status is degraded", () => {
    const degradedData: SystemHealthData = {
      ...sampleData,
      status: "degraded",
    };

    render(<SystemHealthStatusWidget initialData={degradedData} />);
    expect(screen.getByTestId("overall-status-badge")).toHaveTextContent("Degraded");
  });

  it("fetches health data from endpoint on mount when initialData is not provided", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleData,
    }) as any;

    render(<SystemHealthStatusWidget healthEndpoint="/api/test/health" />);

    await waitFor(() => {
      expect(screen.getByTestId("overall-status-badge")).toHaveTextContent("Operational");
    });
  });

  it("displays error toast on network failure", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network offline")) as any;

    render(<SystemHealthStatusWidget healthEndpoint="/api/test/fail" />);

    await waitFor(() => {
      expect(screen.getByTestId("health-error-toast")).toHaveTextContent(
        "Probe connection failed: Network offline"
      );
    });
  });
});

