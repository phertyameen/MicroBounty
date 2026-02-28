const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("🪙 Minting tokens with account:", deployer.address);

  // Load addresses from the saved file
  const addressesPath = path.join(
    __dirname, "..", "..", "frontend", "lib", "abis", "mockToken", "mock-token-addresses.json"
  );
  const { USDC: usdcAddress, USDT: usdtAddress } = JSON.parse(
    fs.readFileSync(addressesPath, "utf8")
  );

  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const usdc = MockERC20.attach(usdcAddress);
  const usdt = MockERC20.attach(usdtAddress);

  // ── Mint targets ──────────────────────────────────────────
  const recipients = [
    deployer.address,
    "0x0e876A03856C41F29C9Eb544EE02B7Bf07604C30"
  ];
  const amount = hre.ethers.parseUnits("10000", 6); // 10,000 USDC/USDT

  for (const recipient of recipients) {
    console.log(`\n📤 Minting to ${recipient}...`);

    await (await usdc.mint(recipient, amount)).wait();
    console.log(`✅ Minted 10,000 USDC`);

    await (await usdt.mint(recipient, amount)).wait();
    console.log(`✅ Minted 10,000 USDT`);
  }

  console.log("\n🎉 Done! Balances minted successfully.");
}

main().catch((error) => {
  console.error("❌ Minting failed:", error);
  process.exitCode = 1;
});