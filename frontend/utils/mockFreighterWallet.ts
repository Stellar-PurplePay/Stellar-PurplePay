/**
 * MockFreighterWallet
 * E2E test fixture and mocking utility simulating Freighter browser extension
 * interactions: connection authorization, network queries, and transaction signing.
 */

export interface MockFreighterOptions {
  publicKey?: string;
  network?: "TESTNET" | "PUBLIC";
  isConnected?: boolean;
  rejectNextSignature?: boolean;
}

export class MockFreighterWallet {
  private _publicKey: string;
  private _network: "TESTNET" | "PUBLIC";
  private _isConnected: boolean;
  private _rejectNextSignature: boolean;

  constructor(options: MockFreighterOptions = {}) {
    this._publicKey =
      options.publicKey ||
      "GDFREIGHTERMOCKTESTINGADDRESSAAAAAAAAAAAAAAAAAAA7654";
    this._network = options.network || "TESTNET";
    this._isConnected = options.isConnected !== undefined ? options.isConnected : true;
    this._rejectNextSignature = options.rejectNextSignature || false;
  }

  async isConnected(): Promise<boolean> {
    return this._isConnected;
  }

  async getPublicKey(): Promise<string> {
    if (!this._isConnected) {
      throw new Error("Freighter wallet is not connected");
    }
    return this._publicKey;
  }

  async getNetwork(): Promise<string> {
    return this._network;
  }

  setNetwork(network: "TESTNET" | "PUBLIC"): void {
    this._network = network;
  }

  setConnected(connected: boolean): void {
    this._isConnected = connected;
  }

  setRejectNextSignature(reject: boolean): void {
    this._rejectNextSignature = reject;
  }

  async signTransaction(xdr: string, _opts?: { networkPassphrase?: string }): Promise<string> {
    if (!this._isConnected) {
      throw new Error("Wallet not connected");
    }
    if (this._rejectNextSignature) {
      this._rejectNextSignature = false;
      throw new Error("User declined transaction signing request");
    }
    // Return mock signed envelope with suffix
    return `${xdr}_MOCK_SIGNED`;
  }

  async signAuthEntry(entryXdr: string, _opts?: { networkPassphrase?: string }): Promise<string> {
    if (!this._isConnected) {
      throw new Error("Wallet not connected");
    }
    if (this._rejectNextSignature) {
      this._rejectNextSignature = false;
      throw new Error("User declined auth entry signing request");
    }
    return `${entryXdr}_MOCK_AUTH_SIGNED`;
  }

  install(targetWindow: any = typeof window !== "undefined" ? window : global): () => void {
    const original = targetWindow.freighter;
    targetWindow.freighter = {
      isConnected: () => this.isConnected(),
      getPublicKey: () => this.getPublicKey(),
      getNetwork: () => this.getNetwork(),
      signTransaction: (xdr: string, opts?: any) => this.signTransaction(xdr, opts),
      signAuthEntry: (xdr: string, opts?: any) => this.signAuthEntry(xdr, opts),
    };

    return () => {
      targetWindow.freighter = original;
    };
  }
}
