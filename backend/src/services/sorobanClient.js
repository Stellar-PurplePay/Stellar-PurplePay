"use strict";

const { SorobanRpc, Contract } = require("@stellar/stellar-sdk");

const SOROBAN_RPC_URL =
  process.env.SOROBAN_RPC_URL ||
  process.env.STELLAR_RPC_URL ||
  (process.env.STELLAR_NETWORK === "mainnet"
    ? "https://rpc.mainnet.stellar.org"
    : "https://rpc-testnet.stellar.org");

// Keep one RPC client for the lifetime of the process. Creating a Server for
// every contract read creates a new connection and defeats HTTP keep-alive.
// Initialize lazily so importing services in tests does not require an RPC
// constructor in every Stellar SDK mock.
let sorobanServer;

function getServer() {
  if (!sorobanServer) {
    sorobanServer = new SorobanRpc.Server(SOROBAN_RPC_URL, {
      allowHttp: SOROBAN_RPC_URL.startsWith("http://"),
    });
  }
  return sorobanServer;
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err) {
  if (!err) return false;
  const msg = String(err.message || "");
  const code = err.code || err.statusCode || err.status;
  return (
    code === 429 ||
    code === 502 ||
    code === 503 ||
    code === 504 ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ECONNRESET") ||
    msg.includes("rate limit") ||
    msg.includes("-32603") ||
    msg.includes("Internal error") ||
    msg.includes("fetch failed")
  );
}

async function executeWithRetry(operation, options = {}) {
  const {
    maxRetries = 3,
    baseDelayMs = 200,
    maxDelayMs = 2000,
    isRetryable = isRetryableError,
  } = options;

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (err) {
      lastError = err;
      if (attempt >= maxRetries || !isRetryable(err)) {
        throw err;
      }
      const exponential = baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 0.3 * exponential;
      const delay = Math.min(exponential + jitter, maxDelayMs);
      await wait(delay);
    }
  }
  throw lastError;
}

function getContract(contractId) {
  return new Contract(contractId);
}

async function readContractValue(contractId, method, args = [], options = {}) {
  const server = getServer();
  const contract = getContract(contractId);

  const tx = new SorobanRpc.TransactionBuilder(undefined, {
    networkPassphrase:
      process.env.STELLAR_NETWORK === "mainnet"
        ? "Public Global Stellar Network ; September 2015"
        : "Test SDF Network ; September 2015",
  })
    .addOperation(contract.call(method, ...args))
    .build();

  const result = await executeWithRetry(
    () => server.simulateTransaction(tx),
    options,
  );

  if (SorobanRpc.Api.isSimulationError(result)) {
    throw new Error(
      `Soroban simulation failed for ${method}: ${result.error}`,
    );
  }

  return result.result ?? null;
}

module.exports = {
  sorobanServer,
  getServer,
  getContract,
  readContractValue,
  executeWithRetry,
  isRetryableError,
  SOROBAN_RPC_URL,
};
