import React from "react";
import { render, screen } from "@testing-library/react";
import TestnetBadge from "../components/TestnetBadge";

describe("TestnetBadge Component", () => {
  it("should render testnet network pill and link by default", () => {
    render(<TestnetBadge />);

    const badge = screen.getByTestId("testnet-badge-root");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("role", "status");
    expect(badge).toHaveAttribute(
      "aria-label",
      "Active Stellar Network: TESTNET"
    );

    const link = screen.getByTestId("explorer-link");
    expect(link).toHaveAttribute(
      "href",
      "https://stellar.expert/explorer/testnet"
    );
  });

  it("should build contract-specific explorer link when contractId is provided", () => {
    const cid = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    render(<TestnetBadge network="testnet" contractId={cid} />);

    const link = screen.getByTestId("explorer-link");
    expect(link).toHaveAttribute(
      "href",
      `https://stellar.expert/explorer/testnet/contract/${cid}`
    );
  });

  it("should render public mainnet styling and explorer url", () => {
    render(<TestnetBadge network="public" />);

    const badge = screen.getByTestId("testnet-badge-root");
    expect(badge).toHaveAttribute(
      "aria-label",
      "Active Stellar Network: PUBLIC"
    );

    const link = screen.getByTestId("explorer-link");
    expect(link).toHaveAttribute(
      "href",
      "https://stellar.expert/explorer/public"
    );
  });
});

