import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { EscrowReconciliationCard } from "../components/EscrowReconciliationCard";
import { useEscrowReconciliation } from "../hooks/useEscrowReconciliation";

jest.mock("../hooks/useEscrowReconciliation");

describe("EscrowReconciliationCard", () => {
  const mockedHook = useEscrowReconciliation as jest.MockedFunction<typeof useEscrowReconciliation>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders card with verified badge when synchronized", () => {
    mockedHook.mockReturnValue({
      isSynchronized: true,
      drifts: [],
      loading: false,
      error: null,
      sync: jest.fn(),
    });

    render(<EscrowReconciliationCard jobId="job-verified-101" />);

    expect(screen.getByText("Smart Contract Synchronization")).toBeInTheDocument();
    expect(screen.getByText("job-verified-101")).toBeInTheDocument();
    expect(screen.getByText("On-Chain Invariants Verified")).toBeInTheDocument();
  });

  it("renders drift details list when out of sync", () => {
    mockedHook.mockReturnValue({
      isSynchronized: false,
      drifts: [
        { field: "status", local: "IN_PROGRESS", onChain: "Completed", severity: "CRITICAL" },
      ],
      loading: false,
      error: null,
      sync: jest.fn(),
    });

    render(<EscrowReconciliationCard jobId="job-drift-102" />);

    expect(screen.getByText("Detected Divergence Details:")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByText("IN_PROGRESS")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders error alert on hook failure", () => {
    mockedHook.mockReturnValue({
      isSynchronized: false,
      drifts: [],
      loading: false,
      error: "Node connection timeout",
      sync: jest.fn(),
    });

    render(<EscrowReconciliationCard jobId="job-err-103" />);

    expect(screen.getByText(/Node connection timeout/)).toBeInTheDocument();
  });

  it("invokes sync when verify button is clicked", () => {
    const syncMock = jest.fn();
    mockedHook.mockReturnValue({
      isSynchronized: true,
      drifts: [],
      loading: false,
      error: null,
      sync: syncMock,
    });

    render(<EscrowReconciliationCard jobId="job-sync-104" />);

    const verifyBtn = screen.getByRole("button", { name: "Verify Again ↻" });
    fireEvent.click(verifyBtn);
    expect(syncMock).toHaveBeenCalledTimes(1);
  });
});
