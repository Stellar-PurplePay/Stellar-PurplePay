"use strict";

const {
  resolveFederatedAddress,
  reverseResolveFederatedAddress,
} = require("./stellarFederationService");

describe("stellarFederationService", () => {
  const validG = "GCGQCFTEFE4W5BNG2QXJN4244ZCQMGLO6G5X65NILEKVLGZTSNZUVHJP";

  it("resolves valid federated address by fetching stellar.toml then querying federation endpoint", async () => {
    const mockClient = {
      get: jest.fn((url) => {
        if (url.includes("stellar.toml")) {
          return Promise.resolve({
            data: `FEDERATION_SERVER = "https://federation.example.com/api"`,
          });
        }
        if (url.includes("type=name")) {
          return Promise.resolve({
            data: {
              account_id: validG,
              memo_type: "text",
              memo: "inv-1234",
            },
          });
        }
        return Promise.reject(new Error("Not found"));
      }),
    };

    const result = await resolveFederatedAddress("bob*example.com", mockClient);

    expect(result.account_id).toBe(validG);
    expect(result.memo_type).toBe("text");
    expect(result.memo).toBe("inv-1234");
    expect(mockClient.get).toHaveBeenCalledTimes(2);
  });

  it("throws when federated address format is invalid", async () => {
    await expect(resolveFederatedAddress("invalid_handle")).rejects.toThrow(
      "Invalid federated address format"
    );
  });

  it("throws when stellar.toml does not define FEDERATION_SERVER", async () => {
    const mockClient = {
      get: jest.fn().mockResolvedValue({ data: "VERSION = '2.0.0'" }),
    };

    await expect(resolveFederatedAddress("bob*example.com", mockClient)).rejects.toThrow(
      "does not define FEDERATION_SERVER"
    );
  });

  it("performs reverse federation resolution by account ID", async () => {
    const mockClient = {
      get: jest.fn().mockResolvedValue({
        data: {
          stellar_address: "bob*example.com",
        },
      }),
    };

    const result = await reverseResolveFederatedAddress(
      validG,
      "https://federation.example.com/api",
      mockClient
    );

    expect(result.stellar_address).toBe("bob*example.com");
  });
});
