import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { StellarExplorerLink } from "../components/StellarExplorerLink";

describe("StellarExplorerLink", () => {
  const dummyTx = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  it("does not render when value is empty", () => {
    const { container } = render(<StellarExplorerLink type="tx" value="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders truncated identifier and external explorer link", () => {
    render(<StellarExplorerLink type="tx" value={dummyTx} network="testnet" />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `https://stellar.expert/explorer/testnet/tx/${dummyTx}`);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.textContent).toBe("e3b0c4...52b855");
  });

  it("renders custom label when provided", () => {
    render(
      <StellarExplorerLink type="tx" value={dummyTx} label="View Settlement Tx" />
    );

    expect(screen.getByText("View Settlement Tx")).toBeInTheDocument();
  });

  it("copies value to clipboard on click", async () => {
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<StellarExplorerLink type="tx" value={dummyTx} />);

    const copyBtn = screen.getByRole("button", { name: "Copy tx to clipboard" });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith(dummyTx);
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });
});
