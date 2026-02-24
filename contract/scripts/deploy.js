const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 Deploying with account:", deployer.address);
  console.log(
    "💰 Account balance:",
    (await deployer.provider.getBalance(deployer.address)).toString()
  );

  // === Token addresses on Polkadot Hub Testnet ===
  // Replace these with the actual USDC and USDT addresses on Polkadot Hub
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x0000000000000000000000000000000000000000";
  const USDT_ADDRESS = process.env.USDT_ADDRESS || "0x0000000000000000000000000000000000000000";

  const initialTokens = [USDC_ADDRESS, USDT_ADDRESS].filter(
    (addr) => addr !== "0x0000000000000000000000000000000000000000"
  );

  console.log("\n📋 Deploying MicroBounty...");
  console.log("   Supported tokens:", initialTokens.length > 0 ? initialTokens : "None (DOT only)");

  const MicroBounty = await hre.ethers.getContractFactory("MicroBounty");
  const microBounty = await MicroBounty.deploy(initialTokens);

  await microBounty.waitForDeployment();

  const contractAddress = await microBounty.getAddress();
  console.log("✅ MicroBounty deployed to:", contractAddress);

  // === Save to frontend ===
  const addresses = {
    MicroBounty: contractAddress,
  };

  saveFrontendFiles(addresses);

  console.log("\n🎉 MicroBounty deployed and saved successfully!");
  console.log("\n📄 Deployment Summary:");
  console.log("   Contract : MicroBounty");
  console.log("   Address  :", contractAddress);
  console.log("   Network  :", hre.network.name);
  console.log("   Deployer :", deployer.address);
  console.log("   Tokens   :", initialTokens.length > 0 ? initialTokens.join(", ") : "DOT only");
}

function saveFrontendFiles(addresses) {
  const contractsDir = path.join(
    __dirname,
    "..",
    "..",
    "frontend",
    "lib",
    "abis"
  );

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Save contract addresses
  fs.writeFileSync(
    path.join(contractsDir, "contract-addresses.json"),
    JSON.stringify(addresses, null, 2)
  );
  console.log("\n📁 Saved contract-addresses.json");

  // Save ABI for each contract
  for (const name of Object.keys(addresses)) {
    try {
      const artifact = hre.artifacts.readArtifactSync(name);
      fs.writeFileSync(
        path.join(contractsDir, `${name}.json`),
        JSON.stringify(artifact, null, 2)
      );
      console.log(`📁 Saved ${name}.json`);
    } catch (error) {
      console.warn(`⚠️  Could not save ABI for ${name}:`, error.message);
    }
  }

  console.log("📁 All contract files saved to frontend/lib/abis/");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});