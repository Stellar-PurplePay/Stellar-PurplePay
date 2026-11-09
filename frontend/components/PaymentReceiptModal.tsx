import React from "react";
import { StellarExplorerLink } from "./StellarExplorerLink";

export interface ReceiptData {
  receiptSerial: string;
  digest: string;
  jobId: string;
  milestoneId: number;
  network?: "testnet" | "mainnet" | "public";
  transaction: {
    hash: string;
    ledger?: number | null;
    explorerUrl?: string;
  };
  settlement: {
    payer: string;
    payee: string;
    grossAmount: string;
    asset: string;
    platformFee?: string;
  };
  issuedAt: string;
}

export interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
}) => {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 print:p-0 print:bg-white"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 print:shadow-none print:border print:border-zinc-300">
        <div className="flex items-center justify-between border-b pb-4 dark:border-zinc-800 print:border-zinc-300">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                ✓ Verified On-Chain
              </span>
              <span className="font-mono text-xs text-zinc-500">
                {receipt.receiptSerial}
              </span>
            </div>
            <h2 id="receipt-modal-title" className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Payment & Settlement Receipt
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt modal"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 print:hidden"
          >
            ✕
          </button>
        </div>

        <div className="my-5 space-y-3.5 text-sm">
          <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
            <div>
              <span className="block text-xs text-zinc-500">Settlement Amount</span>
              <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {receipt.settlement.grossAmount} {receipt.settlement.asset}
              </span>
            </div>
            {receipt.settlement.platformFee && (
              <div className="text-right">
                <span className="block text-xs text-zinc-500">Platform Fee</span>
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {receipt.settlement.platformFee} {receipt.settlement.asset}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-zinc-200 p-2.5 dark:border-zinc-800">
              <span className="block font-semibold text-zinc-500">Payer (Client)</span>
              <span className="block truncate font-mono text-zinc-800 dark:text-zinc-200" title={receipt.settlement.payer}>
                {receipt.settlement.payer}
              </span>
            </div>
            <div className="rounded-xl border border-zinc-200 p-2.5 dark:border-zinc-800">
              <span className="block font-semibold text-zinc-500">Payee (Freelancer)</span>
              <span className="block truncate font-mono text-zinc-800 dark:text-zinc-200" title={receipt.settlement.payee}>
                {receipt.settlement.payee}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Escrow Job ID</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200">{receipt.jobId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Milestone</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">#{receipt.milestoneId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Stellar Transaction</span>
              <StellarExplorerLink
                type="tx"
                value={receipt.transaction.hash}
                network={receipt.network === "mainnet" || receipt.network === "public" ? "mainnet" : "testnet"}
              />
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Settlement Date</span>
              <span className="text-zinc-800 dark:text-zinc-200">{receipt.issuedAt}</span>
            </div>
          </div>

          {/* Cryptographic Proof Hash */}
          <div className="rounded-xl bg-zinc-50 p-2.5 dark:bg-zinc-850">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              SHA-256 Cryptographic Integrity Digest
            </span>
            <span className="block break-all font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
              {receipt.digest}
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end space-x-3 border-t pt-4 dark:border-zinc-800 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            🖨️ Print Receipt
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
