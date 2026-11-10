import { MockFreighterWallet } from "../utils/mockFreighterWallet";

describe("MockFreighterWallet Utility", () => {
  it("should report default connection and public key", async () => {
    const mock = new MockFreighterWallet({
      publicKey: "GBTESTKEYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      network: "TESTNET",
    });

    expect(await mock.isConnected()).toBe(true);
    expect(await mock.getPublicKey()).toBe(
      "GBTESTKEYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    );
    expect(await mock.getNetwork()).toBe("TESTNET");
  });

  it("should throw when accessing public key while disconnected", async () => {
    const mock = new MockFreighterWallet({ isConnected: false });
    expect(await mock.isConnected()).toBe(false);
    await expect(mock.getPublicKey()).rejects.toThrow(/not connected/);
  });

  it("should sign transactions when approved and throw when rejected", async () => {
    const mock = new MockFreighterWallet();
    const signed = await mock.signTransaction("BASE64TXDR");
    expect(signed).toBe("BASE64TXDR_MOCK_SIGNED");

    mock.setRejectNextSignature(true);
    await expect(mock.signTransaction("BASE64TXDR")).rejects.toThrow(
      /User declined transaction signing request/
    );

    // Subsequent signature succeeds (single-shot rejection)
    const subsequent = await mock.signTransaction("BASE64TXDR");
    expect(subsequent).toBe("BASE64TXDR_MOCK_SIGNED");
  });

  it("should install and restore window.freighter mock cleanly", async () => {
    const fakeWindow: any = {};
    const mock = new MockFreighterWallet({ network: "PUBLIC" });

    const uninstall = mock.install(fakeWindow);
    expect(fakeWindow.freighter).toBeDefined();
    expect(await fakeWindow.freighter.getNetwork()).toBe("PUBLIC");

    uninstall();
    expect(fakeWindow.freighter).toBeUndefined();
  });
});
