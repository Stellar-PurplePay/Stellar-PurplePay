import React from "react";
import { render, screen } from "@testing-library/react";
import {
  AuditLogChainViewer,
  AuditBlock,
} from "../components/AuditLogChainViewer";

describe("AuditLogChainViewer", () => {
  const validChain: AuditBlock[] = [
    {
      index: 1,
      action: "escrow_created",
      timestamp: "2026-11-10T00:00:00Z",
      payload: { amount: 1000, asset: "USDC" },
      previousHash: "0".repeat(64),
      entryHash: "1111111111111111111111111111111111111111111111111111111111111111",
    },
    {
      index: 2,
      action: "milestone_approved",
      timestamp: "2026-11-10T01:00:00Z",
      payload: { milestoneId: 1 },
      previousHash: "1111111111111111111111111111111111111111111111111111111111111111",
      entryHash: "2222222222222222222222222222222222222222222222222222222222222222",
    },
  ];

  it("renders empty state when chain is empty", () => {
    render(<AuditLogChainViewer chain={[]} />);
    expect(screen.getByTestId("verification-badge-empty")).toBeInTheDocument();
    expect(screen.getByText(/No audit entries recorded yet/i)).toBeInTheDocument();
  });

  it("renders verified status and timeline cards for a valid chain", () => {
    const onVerify = jest.fn();
    render(<AuditLogChainViewer chain={validChain} onVerify={onVerify} />);

    expect(screen.getByTestId("verification-badge-verified")).toHaveTextContent("✓ Chain Verified");
    expect(screen.getByTestId("audit-block-1")).toBeInTheDocument();
    expect(screen.getByTestId("audit-block-2")).toBeInTheDocument();
    expect(screen.getByText(/ESCROW CREATED/i)).toBeInTheDocument();
    expect(screen.getByText(/MILESTONE APPROVED/i)).toBeInTheDocument();
    expect(onVerify).toHaveBeenCalledWith(true);
  });

  it("detects broken hash links and displays tamper alert", () => {
    const onVerify = jest.fn();
    const brokenChain: AuditBlock[] = [
      validChain[0],
      {
        ...validChain[1],
        previousHash: "badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbad1",
      },
    ];

    render(<AuditLogChainViewer chain={brokenChain} onVerify={onVerify} />);

    expect(screen.getByTestId("verification-badge-tampered")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/Hash link broken at Block #2/i);
    expect(onVerify).toHaveBeenCalledWith(false);
  });

  it("detects mismatch against expectedRootHash", () => {
    const onVerify = jest.fn();
    render(
      <AuditLogChainViewer
        chain={validChain}
        expectedRootHash="3333333333333333333333333333333333333333333333333333333333333333"
        onVerify={onVerify}
      />
    );

    expect(screen.getByTestId("verification-badge-tampered")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/Latest root hash does not match/i);
    expect(onVerify).toHaveBeenCalledWith(false);
  });
});
