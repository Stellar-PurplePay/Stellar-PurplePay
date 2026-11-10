const StellarSdk = require("@stellar/stellar-sdk");

/**
 * Validates deployed Soroban contract configuration against production readiness rules.
 */
class ContractDeploymentVerifier {
  static validateContractAddress(contractId) {
    if (!contractId || typeof contractId !== "string") {
      return { valid: false, reason: "Contract ID must be a non-empty string" };
    }
    // Stellar contract addresses start with C and are 56 chars base32
    if (!StellarSdk.StrKey.isValidMed25519PublicKey(contractId) && !/^C[A-Z2-7]{55}$/.test(contractId)) {
      return { valid: false, reason: "Invalid Soroban contract address format" };
    }
    return { valid: true };
  }

  static verifyContractState({
    contractId,
    admin,
    treasury,
    feeBps,
    isPaused = false,
  }) {
    const errors = [];

    const addrValidation = this.validateContractAddress(contractId);
    if (!addrValidation.valid) {
      errors.push(addrValidation.reason);
    }

    if (!admin || !StellarSdk.StrKey.isValidEd25519PublicKey(admin)) {
      errors.push("Invalid or missing contract admin G-address");
    }

    if (!treasury || !StellarSdk.StrKey.isValidEd25519PublicKey(treasury)) {
      errors.push("Invalid or missing contract treasury G-address");
    }

    const fee = Number(feeBps);
    if (isNaN(fee) || fee < 0 || fee > 1000) {
      errors.push("Platform fee BPS must be between 0 and 1000 (0% - 10%)");
    }

    if (isPaused) {
      errors.push("Contract is currently in PAUSED / EMERGENCY FREEZE state");
    }

    return {
      healthy: errors.length === 0,
      errors,
      contractId,
      admin,
      treasury,
      feeBps: fee,
      isPaused,
      verifiedAt: new Date().toISOString(),
    };
  }
}

if (require.main === module) {
  const contractId = process.env.CONTRACT_ID || process.argv[2];
  const admin = process.env.CONTRACT_ADMIN;
  const treasury = process.env.CONTRACT_TREASURY;
  const feeBps = process.env.PLATFORM_FEE_BPS || 100;

  console.log(`Verifying deployment for contract: ${contractId}...`);
  const result = ContractDeploymentVerifier.verifyContractState({
    contractId,
    admin,
    treasury,
    feeBps,
  });

  if (result.healthy) {
    console.log("✓ Contract deployment verification passed!");
    process.exit(0);
  } else {
    console.error("✗ Contract deployment verification failed:");
    result.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
}

module.exports = ContractDeploymentVerifier;

