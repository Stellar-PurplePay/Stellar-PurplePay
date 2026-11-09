import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ArbitratorRosterTable, ArbitratorProfile } from "../components/ArbitratorRosterTable";

describe("ArbitratorRosterTable", () => {
  const mockArbitrators: ArbitratorProfile[] = [
    {
      name: "Stellar Dispute Labs",
      address: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      bondedAmount: 50000,
      disputesResolved: 45,
      rating: 4.9,
      activeDisputes: 1,
    },
    {
      name: "Alpha Mediation DAO",
      address: "GAPTL2OLC4YDSJJ6MGT3MMBWIYD4GSVKQFU26647IOMBEEXUURNUM32X",
      bondedAmount: 25000,
      disputesResolved: 18,
      rating: 4.6,
      activeDisputes: 0,
    },
    {
      name: "Zeta Neutral Council",
      address: "GCLUST3R4T6J47X6C6Q3S7D4O445X4J7G4Y6B6V4W7J4T6J47X6C6XYZ",
      bondedAmount: 0,
      disputesResolved: 2,
      rating: 3.8,
      activeDisputes: 0,
    },
  ];

  it("renders table with all arbitrators and metrics", () => {
    render(<ArbitratorRosterTable arbitrators={mockArbitrators} />);

    expect(screen.getByText("Authorized Arbitrator Panel")).toBeInTheDocument();
    expect(screen.getByText("Stellar Dispute Labs")).toBeInTheDocument();
    expect(screen.getByText("Alpha Mediation DAO")).toBeInTheDocument();
    expect(screen.getByText("Zeta Neutral Council")).toBeInTheDocument();
    expect(screen.getByText("50,000 XLM")).toBeInTheDocument();
    expect(screen.getByText("Unbonded")).toBeInTheDocument();
    expect(screen.getByText("★ 4.9 / 5.0")).toBeInTheDocument();
  });

  it("filters arbitrators by search query", () => {
    render(<ArbitratorRosterTable arbitrators={mockArbitrators} />);

    const searchInput = screen.getByPlaceholderText(/Search arbitrator by name/i);
    fireEvent.change(searchInput, { target: { value: "Alpha" } });

    expect(screen.getByText("Alpha Mediation DAO")).toBeInTheDocument();
    expect(screen.queryByText("Stellar Dispute Labs")).toBeNull();
  });

  it("sorts table when column headers are clicked", () => {
    render(<ArbitratorRosterTable arbitrators={mockArbitrators} />);

    // Click on Arbitrator name header to sort ascending
    const nameHeader = screen.getByRole("columnheader", { name: /^Arbitrator/ });
    fireEvent.click(nameHeader);

    const rows = screen.getAllByRole("row");
    // Row 0 is header, Row 1 should be Alpha Mediation DAO
    expect(rows[1]).toHaveTextContent("Alpha Mediation DAO");

    // Click again to sort descending
    fireEvent.click(nameHeader);
    const updatedRows = screen.getAllByRole("row");
    expect(updatedRows[1]).toHaveTextContent("Zeta Neutral Council");
  });

  it("triggers onSelectArbitrator when select button is clicked", () => {
    const mockSelect = jest.fn();
    render(
      <ArbitratorRosterTable
        arbitrators={mockArbitrators}
        onSelectArbitrator={mockSelect}
      />
    );

    const selectButtons = screen.getAllByRole("button", { name: "Select" });
    fireEvent.click(selectButtons[0]);

    expect(mockSelect).toHaveBeenCalledWith(mockArbitrators[0].address);
  });
});
