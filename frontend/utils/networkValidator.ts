export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export const MAINNET_PASSPHRASE = "Public Global Stellar Network ; September 2015";
export const FUTURENET_PASSPHRASE = "Test SDF Future Network ; October 2022";

export type StellarNetworkName = "testnet" | "mainnet" | "futurenet" | "unknown";

/**
 * Maps a network passphrase to its canonical network name.
 */
export function getNetworkFromPassphrase(passphrase?: string): StellarNetworkName {
  if (!passphrase) return "unknown";
  if (passphrase === MAINNET_PASSPHRASE) return "mainnet";
  if (passphrase === TESTNET_PASSPHRASE) return "testnet";
  if (passphrase === FUTURENET_PASSPHRASE) return "futurenet";
  return "unknown";
}

/**
 * Returns user-friendly display labels for networks.
 */
export function getNetworkDisplayName(networkOrPassphrase: string): string {
  if (networkOrPassphrase === "mainnet" || networkOrPassphrase === MAINNET_PASSPHRASE) {
    return "Stellar Public Network (Mainnet)";
  }
  if (networkOrPassphrase === "testnet" || networkOrPassphrase === TESTNET_PASSPHRASE) {
    return "Stellar Testnet";
  }
  if (networkOrPassphrase === "futurenet" || networkOrPassphrase === FUTURENET_PASSPHRASE) {
    return "Stellar Futurenet";
  }
  return "Custom Network";
}

/**
 * Compares application configured network with the active wallet network passphrase.
 */
export function validateNetworkMatch(
  appNetwork: "testnet" | "mainnet",
  walletPassphrase?: string
): {
  matches: boolean;
  appNetwork: string;
  walletNetwork: StellarNetworkName;
  warning?: string;
} {
  const walletNetwork = getNetworkFromPassphrase(walletPassphrase);
  const matches = appNetwork === walletNetwork;

  if (matches) {
    return { matches: true, appNetwork, walletNetwork };
  }

  const appLabel = getNetworkDisplayName(appNetwork);
  const walletLabel = getNetworkDisplayName(walletPassphrase || "");

  const warning = `Network mismatch detected: PurplePay is running on ${appLabel}, but your Freighter wallet is currently set to ${walletLabel}. Please switch network in your Freighter extension to sign transactions safely.`;

  return {
    matches: false,
    appNetwork,
    walletNetwork,
    warning,
  };
}

/**
 * Generates Stellar.Expert block explorer links for accounts, transactions, and contracts.
 */
export function getStellarExpertUrl(
  identifier: string,
  network: "testnet" | "mainnet",
  type: "tx" | "account" | "contract" = "tx"
): string {
  const base = "https://stellar.expert/explorer";
  const networkSegment = network === "mainnet" ? "public" : "testnet";
  return `${base}/${networkSegment}/${type}/${encodeURIComponent(identifier)}`;
}
