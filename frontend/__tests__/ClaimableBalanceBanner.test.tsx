import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ClaimableBalanceBanner } from "../components/ClaimableBalanceBanner";

describe("ClaimableBalanceBanner component", () => {
  const mockBalances = [
    {
      id: "cb-123",
      amount: "150.00",
      asset: "XLM",
      sponsor: "GCGQCFTEFE4W5BNG2QXJN4244ZCQMGLO6G5X65NILEKVLGZTSNZUVHJP",
      canClaim: true,
    },
    {
      id: "cb-456",
      amount: "50.00",
      asset: "USDC",
      sponsor: "GCGQCFTEFE4W5BNG2QXJN4244ZCQMGLO6G5X65NILEKVLGZTSNZUVHJP",
      canClaim: false,
    },
  ];

  it("does not render when balance list is empty", () => {
    const { container } = render(
      <ClaimableBalanceBanner claimableBalances={[]} onClaim={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders pending balances with region accessibility landmark", () => {
    render(<ClaimableBalanceBanner claimableBalances={mockBalances} onClaim={jest.fn()} />);

    expect(screen.getByRole("region")).toBeInTheDocument();
    expect(screen.getByText("Pending Claimable Balances (2)")).toBeInTheDocument();
    expect(screen.getByText("150.00 XLM")).toBeInTheDocument();
    expect(screen.getByText("50.00 USDC")).toBeInTheDocument();
  });

  it("allows claiming when canClaim is true", async () => {
    const handleClaim = jest.fn().mockResolvedValue(undefined);
    render(<ClaimableBalanceBanner claimableBalances={mockBalances} onClaim={handleClaim} />);

    const claimBtn = screen.getByRole("button", { name: "Claim Funds" });
    fireEvent.click(claimBtn);

    await waitFor(() => {
      expect(handleClaim).toHaveBeenCalledWith("cb-123");
    });
  });

  it("disables button when predicate is locked", () => {
    render(<ClaimableBalanceBanner claimableBalances={mockBalances} onClaim={jest.fn()} />);

    const lockedBtn = screen.getByRole("button", { name: "Predicate Locked" });
    expect(lockedBtn).toBeDisabled();
  });
});
