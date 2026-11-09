/**
 * frontend/utils/stellarExplorerUrl.ts
 *
 * Utility to construct canonical Stellar Expert explorer links for transactions,
 * accounts, contracts, and ledgers across testnet, futurenet, and mainnet.
 */

export type StellarNetworkTarget = "mainnet" | "public" | "testnet" | "futurenet";

export type StellarEntityType = "tx" | "account" | "contract" | "ledger";

export interface ExplorerLinkOptions {
  network?: StellarNetworkTarget;
  customBaseUrl?: string;
}

/**
 * Builds a direct Stellar Expert URL for the specified entity.
 *
 * @param type - Type of entity ('tx', 'account', 'contract', 'ledger')
 * @param identifier - Entity hash, address, or ledger sequence number
 * @param options - Network or custom base URL configuration
 * @returns Fully qualified explorer URL string
 */
export function buildStellarExplorerUrl(
  type: StellarEntityType,
  identifier: string | number,
  options: ExplorerLinkOptions = {}
): string {
  const cleanId = String(identifier || "").trim();
  if (!cleanId) {
    return "#";
  }

  const network = options.network || "testnet";
  const networkSegment = network === "mainnet" || network === "public" ? "public" : network;

  const base = options.customBaseUrl || "https://stellar.expert/explorer";
  return `${base}/${networkSegment}/${type}/${cleanId}`;
}

/**
 * Convenience helper to format a 64-char transaction hash link.
 */
export function getTxExplorerUrl(txHash: string, network: StellarNetworkTarget = "testnet"): string {
  return buildStellarExplorerUrl("tx", txHash, { network });
}

/**
 * Convenience helper to format an account G-address link.
 */
export function getAccountExplorerUrl(
  address: string,
  network: StellarNetworkTarget = "testnet"
): string {
  return buildStellarExplorerUrl("account", address, { network });
}

/**
 * Convenience helper to format a contract C-address link.
 */
export function getContractExplorerUrl(
  contractId: string,
  network: StellarNetworkTarget = "testnet"
): string {
  return buildStellarExplorerUrl("contract", contractId, { network });
}
