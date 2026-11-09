import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PaymentReceiptModal, ReceiptData } from "../components/PaymentReceiptModal";

describe("PaymentReceiptModal", () => {
  const mockReceipt: ReceiptData = {
    receiptSerial: "RCPT-TEST-0001",
    digest: "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0",
    jobId: "JOB-456",
    milestoneId: 2,
    network: "testnet",
    transaction: {
      hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      ledger: 123456,
      explorerUrl: "https://stellar.expert/explorer/testnet/tx/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    },
    settlement: {
      payer: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3IF53G4J7734",
      payee: "GBZH7S6HV22Q725U4FOWEELX66B62M5F7V3GZ7F4GVR5F4ZJFF34X7LM",
      grossAmount: "500.00",
      asset: "USDC",
      platformFee: "5.00",
    },
    issuedAt: "2026-11-09T22:00:00.000Z",
  };

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <PaymentReceiptModal isOpen={false} onClose={jest.fn()} receipt={mockReceipt} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("does not render when receipt is null", () => {
    const { container } = render(
      <PaymentReceiptModal isOpen={true} onClose={jest.fn()} receipt={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders receipt details, settlement numbers, and crypto digest", () => {
    render(
      <PaymentReceiptModal isOpen={true} onClose={jest.fn()} receipt={mockReceipt} />
    );

    expect(screen.getByText("Payment & Settlement Receipt")).toBeInTheDocument();
    expect(screen.getByText("RCPT-TEST-0001")).toBeInTheDocument();
    expect(screen.getByText("500.00 USDC")).toBeInTheDocument();
    expect(screen.getByText("5.00 USDC")).toBeInTheDocument();
    expect(screen.getByText("JOB-456")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText(mockReceipt.digest)).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = jest.fn();
    render(
      <PaymentReceiptModal isOpen={true} onClose={onClose} receipt={mockReceipt} />
    );

    const closeBtn = screen.getByRole("button", { name: "Close receipt modal" });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("triggers window.print when print button is clicked", () => {
    const printSpy = jest.spyOn(window, "print").mockImplementation(() => {});

    render(
      <PaymentReceiptModal isOpen={true} onClose={jest.fn()} receipt={mockReceipt} />
    );

    const printBtn = screen.getByRole("button", { name: /Print Receipt/i });
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalledTimes(1);

    printSpy.mockRestore();
  });
});
