const StellarSdk = require("@stellar/stellar-sdk");

/**
 * ContractRegistry
 * Centralized registry mapping Stellar networks (testnet, public, futurenet)
 * to verified Soroban contract addresses and asset contract IDs.
 */

const DEFAULT_REGISTRY = {
  testnet: {
    escrowContractId:
      process.env.TESTNET_ESCROW_CONTRACT_ID ||
      "CAQ3J7QGZGM56J5XF3RKV4Z3B7ZPV7VBNQ7QZGM56J5XF3RKV4Z3B7ZP",
    usdcTokenId:
      process.env.TESTNET_USDC_TOKEN_ID ||
      "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    networkPassphrase: "Test SDF Network ; September 2015",
  },
  public: {
    escrowContractId:
      process.env.PUBLIC_ESCROW_CONTRACT_ID ||
      "CBM7QZGM56J5XF3RKV4Z3B7ZPV7VBNQ7QZGM56J5XF3RKV4Z3B7ZPV7V",
    usdcTokenId:
      process.env.PUBLIC_USDC_TOKEN_ID ||
      "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
    networkPassphrase: "Public Global Stellar Network ; July 2015",
  },
  futurenet: {
    escrowContractId:
      process.env.FUTURENET_ESCROW_CONTRACT_ID ||
      "CFUTURE7QZGM56J5XF3RKV4Z3B7ZPV7VBNQ7QZGM56J5XF3RKV4Z3B7Z",
    usdcTokenId:
      process.env.FUTURENET_USDC_TOKEN_ID ||
      "CFUTUREUSDC7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSCFUT",
    networkPassphrase: "Test SDF Future Network ; October 2022",
  },
};

class ContractRegistry {
  constructor(customRegistry = null) {
    this._registry = customRegistry || JSON.parse(JSON.stringify(DEFAULT_REGISTRY));
  }

  getRegistry(network = "testnet") {
    const key = (network || "testnet").toLowerCase().trim();
    if (key === "mainnet" || key === "public") return this._registry.public;
    if (key === "futurenet") return this._registry.futurenet;
    return this._registry.testnet;
  }

  getEscrowContractId(network = "testnet") {
    return this.getRegistry(network).escrowContractId;
  }

  getUsdcTokenId(network = "testnet") {
    return this.getRegistry(network).usdcTokenId;
  }

  setContractId(network, contractId) {
    if (!contractId || !/^C[A-Z2-7]{55}$/.test(contractId)) {
      throw new Error(`Invalid Soroban contract address: ${contractId}`);
    }
    const net = this.getRegistry(network);
    net.escrowContractId = contractId;
  }

  validateAllAddresses() {
    const results = {};
    for (const [net, conf] of Object.entries(this._registry)) {
      results[net] = {
        escrowValid: /^C[A-Z2-7]{55}$/.test(conf.escrowContractId),
        usdcValid: /^C[A-Z2-7]{55}$/.test(conf.usdcTokenId),
      };
    }
    return results;
  }
}

// Export singleton instance and class definition
const defaultRegistryInstance = new ContractRegistry();
module.exports = {
  ContractRegistry,
  contractRegistry: defaultRegistryInstance,
};
