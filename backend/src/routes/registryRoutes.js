const express = require("express");
const { contractRegistry } = require("../services/contractRegistry");

const router = express.Router();

/**
 * GET /api/registry
 * Exposes active network contract IDs and verified token contracts.
 */
router.get("/", (req, res) => {
  const requestedNetwork =
    req.query.network || process.env.STELLAR_NETWORK || "testnet";
  const config = contractRegistry.getRegistry(requestedNetwork);

  return res.json({
    network: requestedNetwork.toLowerCase(),
    escrowContractId: config.escrowContractId,
    usdcTokenId: config.usdcTokenId,
    networkPassphrase: config.networkPassphrase,
  });
});

module.exports = router;
