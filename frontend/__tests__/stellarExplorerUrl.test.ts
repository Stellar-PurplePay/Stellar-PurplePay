import {
  buildStellarExplorerUrl,
  getTxExplorerUrl,
  getAccountExplorerUrl,
  getContractExplorerUrl,
} from "../utils/stellarExplorerUrl";

describe("stellarExplorerUrl", () => {
  const dummyTx = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const dummyAccount = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const dummyContract = "CA5DEQZ64FKZL7KVWOEKXWJVZJXP4JKEQUAO7GFNYZYQRKI6N5CWEDU3";

  it("builds testnet transaction link by default", () => {
    const url = getTxExplorerUrl(dummyTx);
    expect(url).toBe(`https://stellar.expert/explorer/testnet/tx/${dummyTx}`);
  });

  it("builds mainnet transaction link using 'public' segment", () => {
    const url = getTxExplorerUrl(dummyTx, "mainnet");
    expect(url).toBe(`https://stellar.expert/explorer/public/tx/${dummyTx}`);
  });

  it("builds account URL", () => {
    const url = getAccountExplorerUrl(dummyAccount, "testnet");
    expect(url).toBe(`https://stellar.expert/explorer/testnet/account/${dummyAccount}`);
  });

  it("builds contract URL", () => {
    const url = getContractExplorerUrl(dummyContract, "testnet");
    expect(url).toBe(`https://stellar.expert/explorer/testnet/contract/${dummyContract}`);
  });

  it("builds ledger sequence URL", () => {
    const url = buildStellarExplorerUrl("ledger", 1234567, { network: "testnet" });
    expect(url).toBe("https://stellar.expert/explorer/testnet/ledger/1234567");
  });

  it("returns '#' for empty identifiers", () => {
    expect(buildStellarExplorerUrl("tx", "")).toBe("#");
  });
});
