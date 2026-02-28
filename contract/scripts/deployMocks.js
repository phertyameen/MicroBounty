const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 Deploying mock tokens with account:", deployer.address);

  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");

  // Deploy mock USDC
  console.log("\n📋 Deploying mock USDC...");
  const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ Mock USDC deployed to:", usdcAddress);

  // Deploy mock USDT
  console.log("\n📋 Deploying mock USDT...");
  const usdt = await MockERC20.deploy("Tether USD", "USDT", 6);
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("✅ Mock USDT deployed to:", usdtAddress);

  console.log("\n📄 Copy these into your .env file:");
  console.log(`USDC_ADDRESS=${usdcAddress}`);
  console.log(`USDT_ADDRESS=${usdtAddress}`);

  // Save to frontend
  const addresses = { USDC: usdcAddress, USDT: usdtAddress };
  const contractsDir = path.join(__dirname, "..", "..", "frontend", "lib", "abis", "mockToken");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(contractsDir, "mock-token-addresses.json"),
    JSON.stringify(addresses, null, 2)
  );

  for (const name of ["MockERC20"]) {
    try {
      const artifact = hre.artifacts.readArtifactSync(name);
      fs.writeFileSync(
        path.join(contractsDir, `${name}.json`),
        JSON.stringify(artifact, null, 2)
      );
    } catch (error) {
      console.warn(`⚠️  Could not save ABI for ${name}:`, error.message);
    }
  }

  console.log("\n📁 Token addresses saved to frontend/lib/abis/mockToken/mock-token-addresses.json");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});