"use strict";

const { StellarTransactionFetcher } = require("./stellarTransactionFetcher");

describe("StellarTransactionFetcher", () => {
  const dummyHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  let mockServer;
  let txCallMock;
  let opsCallMock;

  beforeEach(() => {
    txCallMock = jest.fn();
    opsCallMock = jest.fn();

    mockServer = {
      transactions: jest.fn().mockReturnValue({
        transaction: jest.fn().mockReturnValue({
          call: txCallMock,
        }),
      }),
      operations: jest.fn().mockReturnValue({
        forTransaction: jest.fn().mockReturnValue({
          call: opsCallMock,
        }),
      }),
    };
  });

  it("throws 400 INVALID_TX_HASH for malformed transaction hashes", async () => {
    const fetcher = new StellarTransactionFetcher({ server: mockServer });

    await expect(fetcher.getTransactionDetails("invalid-hash")).rejects.toMatchObject({
      code: "INVALID_TX_HASH",
      status: 400,
    });
    await expect(fetcher.getTransactionDetails("")).rejects.toMatchObject({
      code: "INVALID_TX_HASH",
    });
    await expect(fetcher.getTransactionDetails(null)).rejects.toMatchObject({
      code: "INVALID_TX_HASH",
    });
  });

  it("fetches and parses transaction record with memo and fees", async () => {
    txCallMock.mockResolvedValue({
      hash: dummyHash,
      successful: true,
      ledger: 456789,
      created_at: "2026-11-09T22:30:00Z",
      source_account: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3IF53G4J7734",
      fee_charged: "1000",
      max_fee: "2000",
      operation_count: 1,
      memo_type: "text",
      memo: "Invoice 123",
      paging_token: "456789",
    });

    opsCallMock.mockResolvedValue({
      records: [
        {
          id: "123456",
          type: "payment",
          type_i: 1,
          source_account: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3IF53G4J7734",
          created_at: "2026-11-09T22:30:00Z",
          transaction_successful: true,
          from: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3IF53G4J7734",
          to: "GBZH7S6HV22Q725U4FOWEELX66B62M5F7V3GZ7F4GVR5F4ZJFF34X7LM",
          amount: "150.0000000",
          asset_type: "native",
        },
      ],
    });

    const fetcher = new StellarTransactionFetcher({ server: mockServer });
    const result = await fetcher.getTransactionDetails(dummyHash);

    expect(result.hash).toBe(dummyHash);
    expect(result.successful).toBe(true);
    expect(result.ledger).toBe(456789);
    expect(result.feeCharged).toEqual({
      stroops: 1000,
      xlm: "0.0001000",
    });
    expect(result.maxFee).toEqual({
      stroops: 2000,
      xlm: "0.0002000",
    });
    expect(result.memo).toEqual({
      type: "text",
      value: "Invoice 123",
    });
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].type).toBe("payment");
    expect(result.operations[0].details.asset).toBe("XLM");
    expect(result.operations[0].details.amount).toBe("150.0000000");
  });

  it("serves repeated requests from cache within TTL", async () => {
    txCallMock.mockResolvedValue({
      hash: dummyHash,
      successful: true,
      fee_charged: "100",
      memo_type: "none",
    });
    opsCallMock.mockResolvedValue({ records: [] });

    const fetcher = new StellarTransactionFetcher({ server: mockServer, cacheTtlMs: 60000 });

    const first = await fetcher.getTransactionDetails(dummyHash);
    const second = await fetcher.getTransactionDetails(dummyHash);

    expect(first).toEqual(second);
    expect(txCallMock).toHaveBeenCalledTimes(1);
    expect(opsCallMock).toHaveBeenCalledTimes(1);
  });

  it("translates Horizon 404 response to TRANSACTION_NOT_FOUND", async () => {
    const error404 = new Error("Not Found");
    error404.response = { status: 404 };
    txCallMock.mockRejectedValue(error404);

    const fetcher = new StellarTransactionFetcher({ server: mockServer });

    await expect(fetcher.getTransactionDetails(dummyHash)).rejects.toMatchObject({
      code: "TRANSACTION_NOT_FOUND",
      status: 404,
    });
  });
});
